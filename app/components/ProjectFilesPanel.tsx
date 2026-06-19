"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ProjectChatMessageInsert,
  ProjectFileAuditEventInsert,
  ProjectFileNoteRow,
  ProjectFileRow,
} from "@/lib/types";
import { getProjectFileDownloadUrl } from "../projects/actions";

const BUCKET_NAME = "project-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const stages = ["PCM", "Costing", "Final"] as const;
const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const mimeTypeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

type ProjectFilesPanelProps = {
  projectId: string;
  onActivityChange?: () => void;
};

type ProjectFileStage = (typeof stages)[number];
type WorkflowAction = "upload" | "replace";
type WorkflowRow = {
  slot: number;
} & Partial<Record<ProjectFileStage, ProjectFileRow>>;

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getUploadContentType(file: File) {
  return file.type || mimeTypeByExtension[getFileExtension(file.name)] || "application/octet-stream";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function validateFile(file: File) {
  const extension = getFileExtension(file.name);
  const hasAllowedExtension = allowedExtensions.includes(extension);
  const hasAllowedMimeType = file.type ? allowedMimeTypes.has(file.type) : true;

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return "Only PDF, Word, and Excel files are supported.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Files must be 20 MB or smaller.";
  }

  return "";
}

function getProjectFilesErrorMessage(message: string) {
  if (
    message.includes("project_files") &&
    message.toLowerCase().includes("schema cache")
  ) {
    return "Project file storage is not set up yet. Run the project_files Supabase migration, then reload this page.";
  }

  return message;
}

function getUserLabel(user: { email?: string } | null) {
  return user?.email ?? "Unknown user";
}

function getCellInputKey(stage: ProjectFileStage, slot: number, action: WorkflowAction) {
  return `${stage}-${slot}-${action}`;
}

function getStageOrder(stage: ProjectFileStage) {
  return stages.indexOf(stage);
}

function getAuditAction(stage: ProjectFileStage, action: "uploaded" | "replaced" | "deleted") {
  return `${stage} ${action}` as ProjectFileAuditEventInsert["action"];
}

function isNewer(left?: ProjectFileRow, right?: ProjectFileRow) {
  if (!left || !right) return false;
  return new Date(left.uploaded_at).getTime() > new Date(right.uploaded_at).getTime();
}

function buildWorkflowRows(files: ProjectFileRow[]) {
  const currentFiles = files.filter((file) => file.is_current_version);
  const slots = new Set<number>();

  files.forEach((file) => slots.add(file.workflow_slot));
  if (slots.size === 0) slots.add(1);

  return [...slots]
    .sort((left, right) => left - right)
    .map((slot) => {
      const row: WorkflowRow = { slot };

      stages.forEach((stage) => {
        row[stage] = currentFiles.find(
          (file) => file.workflow_slot === slot && file.file_stage === stage
        );
      });

      return row;
    });
}

export default function ProjectFilesPanel({
  projectId,
  onActivityChange,
}: ProjectFilesPanelProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const addPcmInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [notes, setNotes] = useState<ProjectFileNoteRow[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [selectedNoteFileId, setSelectedNoteFileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingTarget, setWorkingTarget] = useState("");
  const [dragTarget, setDragTarget] = useState("");
  const [openMenuTarget, setOpenMenuTarget] = useState("");
  const [historyTarget, setHistoryTarget] = useState<{
    stage: ProjectFileStage;
    slot: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [isDownloading, startDownloadTransition] = useTransition();

  const rows = buildWorkflowRows(files);
  const nextSlot = Math.max(...rows.map((row) => row.slot), 0) + 1;
  const displayRows = rows.length > 0 ? rows : [{ slot: 1 }];
  const historyFiles = historyTarget
    ? files
        .filter(
          (file) =>
            file.workflow_slot === historyTarget.slot &&
            file.file_stage === historyTarget.stage
        )
        .sort((left, right) => right.version_number - left.version_number)
    : [];
  const notesByFileId = notes.reduce<Record<string, ProjectFileNoteRow[]>>((groupedNotes, note) => {
    const fileNotes = groupedNotes[note.project_file_id] ?? [];
    return {
      ...groupedNotes,
      [note.project_file_id]: [...fileNotes, note],
    };
  }, {});
  const selectedNoteFile = selectedNoteFileId
    ? files.find((file) => file.id === selectedNoteFileId && file.is_current_version)
    : undefined;

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("workflow_slot", { ascending: true })
      .order("file_stage", { ascending: true })
      .order("version_number", { ascending: false });

    if (error) {
      setError(getProjectFilesErrorMessage(error.message));
      setFiles([]);
    } else {
      setFiles(data);
    }

    setLoading(false);
  }, [projectId]);

  const refreshNotes = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_file_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(getProjectFilesErrorMessage(error.message));
      setNotes([]);
    } else {
      setNotes(data);
    }
  }, [projectId]);

  useEffect(() => {
    const loadFilesAndNotes = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const [{ data: fileData, error: fileError }, { data: noteData, error: noteError }] =
        await Promise.all([
          supabase
            .from("project_files")
            .select("*")
            .eq("project_id", projectId)
            .order("workflow_slot", { ascending: true })
            .order("file_stage", { ascending: true })
            .order("version_number", { ascending: false }),
          supabase
            .from("project_file_notes")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false }),
        ]);

      if (fileError || noteError) {
        setError(getProjectFilesErrorMessage(fileError?.message ?? noteError?.message ?? "Unable to load files."));
        setFiles([]);
        setNotes([]);
      } else {
        setFiles(fileData);
        setNotes(noteData);
      }

      setLoading(false);
    };

    loadFilesAndNotes();
  }, [projectId]);

  const insertAuditEvent = async (
    supabase: ReturnType<typeof createClient>,
    user: { id: string; email?: string },
    file: ProjectFileRow,
    action: ProjectFileAuditEventInsert["action"]
  ) => {
    const auditEvent: ProjectFileAuditEventInsert = {
      project_id: projectId,
      project_file_id: file.id,
      user_id: user.id,
      actor_label: getUserLabel(user),
      action,
      file_stage: file.file_stage,
      workflow_slot: file.workflow_slot,
      version_number: file.version_number,
      file_name: file.file_name,
    };

    const { error } = await supabase.from("project_file_audit_events").insert(auditEvent);
    if (error) {
      setError(`Audit log failed: ${getProjectFilesErrorMessage(error.message)}`);
    }
  };

  const insertChatMessage = async (
    supabase: ReturnType<typeof createClient>,
    user: { id: string; email?: string },
    file: ProjectFileRow,
    action: string
  ) => {
    const chatMessage: ProjectChatMessageInsert = {
      project_id: projectId,
      user_id: user.id,
      message_type: "file_upload",
      body: `${getUserLabel(user)} ${action} ${file.file_name} for ${file.file_stage} row ${file.workflow_slot}.`,
      file_id: file.id,
      file_name: file.file_name,
      author_label: getUserLabel(user),
    };

    const { error } = await supabase.from("project_chat_messages").insert(chatMessage);
    if (error) {
      setError(`${file.file_name}: action saved, but chat notification failed: ${getProjectFilesErrorMessage(error.message)}`);
    }
  };

  const handleSaveNote = async (file: ProjectFileRow) => {
    const note = (noteDrafts[file.id] ?? "").trim();
    if (!note) {
      return;
    }

    setError("");
    setWorkingTarget(`${file.id}-note`);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setError(userError?.message ?? "You must be signed in to add notes.");
      setWorkingTarget("");
      return;
    }

    const { error } = await supabase.from("project_file_notes").insert({
      project_file_id: file.id,
      project_id: projectId,
      user_id: user.id,
      note,
    });

    if (error) {
      setError(getProjectFilesErrorMessage(error.message));
    } else {
      setNoteDrafts((currentDrafts) => ({
        ...currentDrafts,
        [file.id]: "",
      }));
      await refreshNotes();
    }

    setWorkingTarget("");
  };

  const handleUpdateNote = async (note: ProjectFileNoteRow) => {
    const nextNote = editNoteDraft.trim();
    if (!nextNote) {
      return;
    }

    setError("");
    setWorkingTarget(`${note.id}-edit-note`);

    const supabase = createClient();
    const { error } = await supabase
      .from("project_file_notes")
      .update({ note: nextNote })
      .eq("id", note.id)
      .eq("project_id", projectId);

    if (error) {
      setError(getProjectFilesErrorMessage(error.message));
    } else {
      setEditingNoteId("");
      setEditNoteDraft("");
      await refreshNotes();
    }

    setWorkingTarget("");
  };

  const handleDeleteNote = async (note: ProjectFileNoteRow) => {
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) {
      return;
    }

    setError("");
    setWorkingTarget(`${note.id}-delete-note`);

    const supabase = createClient();
    const { error } = await supabase
      .from("project_file_notes")
      .delete()
      .eq("id", note.id)
      .eq("project_id", projectId);

    if (error) {
      setError(getProjectFilesErrorMessage(error.message));
    } else {
      if (editingNoteId === note.id) {
        setEditingNoteId("");
        setEditNoteDraft("");
      }
      await refreshNotes();
    }

    setWorkingTarget("");
  };

  const uploadOneFile = async (
    supabase: ReturnType<typeof createClient>,
    user: { id: string; email?: string },
    file: File,
    stage: ProjectFileStage,
    slot: number,
    action: WorkflowAction
  ) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(`${file.name}: ${validationError}`);
      return;
    }

    const existingVersions = files.filter(
      (item) => item.workflow_slot === slot && item.file_stage === stage
    );
    const currentFile = existingVersions.find((item) => item.is_current_version);
    const nextVersion = Math.max(...existingVersions.map((item) => item.version_number), 0) + 1;
    const stagePath = stage.toLowerCase();
    const storagePath = `${user.id}/${projectId}/${slot}-${stagePath}/v${nextVersion}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const contentType = getUploadContentType(file);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType,
        upsert: false,
      });

    if (uploadError) {
      setError(`${file.name}: ${uploadError.message}`);
      return;
    }

    if (currentFile) {
      const { error: updateError } = await supabase
        .from("project_files")
        .update({ is_current_version: false })
        .eq("id", currentFile.id);

      if (updateError) {
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        setError(`${file.name}: ${getProjectFilesErrorMessage(updateError.message)}`);
        return;
      }
    }

    const { data: insertedFile, error: insertError } = await supabase
      .from("project_files")
      .insert({
        project_id: projectId,
        user_id: user.id,
        storage_bucket: BUCKET_NAME,
        storage_path: storagePath,
        file_name: file.name,
        file_stage: stage,
        workflow_slot: slot,
        version_number: nextVersion,
        uploaded_by: getUserLabel(user),
        is_current_version: true,
        file_type: contentType,
        file_size: file.size,
      })
      .select("*")
      .single();

    if (insertError || !insertedFile) {
      if (currentFile) {
        await supabase
          .from("project_files")
          .update({ is_current_version: true })
          .eq("id", currentFile.id);
      }
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      setError(`${file.name}: ${getProjectFilesErrorMessage(insertError?.message ?? "Unable to save file metadata.")}`);
      return;
    }

    const auditAction = getAuditAction(stage, action === "replace" ? "replaced" : "uploaded");
    await insertAuditEvent(supabase, user, insertedFile, auditAction);
    await insertChatMessage(supabase, user, insertedFile, action === "replace" ? "replaced" : "uploaded");
  };

  const uploadFiles = async (
    selectedFiles: FileList | File[],
    stage: ProjectFileStage,
    slot: number,
    action: WorkflowAction
  ) => {
    const nextFiles = Array.from(selectedFiles);
    if (nextFiles.length === 0) return;

    setError("");
    setWorkingTarget(getCellInputKey(stage, slot, action));

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setError(userError?.message ?? "You must be signed in to upload files.");
      setWorkingTarget("");
      return;
    }

    if (stage === "PCM" && action === "upload") {
      for (const [index, file] of nextFiles.entries()) {
        await uploadOneFile(supabase, user, file, stage, slot + index, action);
      }
    } else {
      await uploadOneFile(supabase, user, nextFiles[0], stage, slot, action);
    }

    setWorkingTarget("");
    await refreshFiles();
    onActivityChange?.();
  };

  const handleFileInput = async (
    event: ChangeEvent<HTMLInputElement>,
    stage: ProjectFileStage,
    slot: number,
    action: WorkflowAction
  ) => {
    if (event.target.files) {
      await uploadFiles(event.target.files, stage, slot, action);
      event.target.value = "";
    }
  };

  const handleDrop = async (
    event: DragEvent<HTMLDivElement>,
    stage: ProjectFileStage,
    slot: number
  ) => {
    event.preventDefault();
    setDragTarget("");
    await uploadFiles(event.dataTransfer.files, stage, slot, "upload");
  };

  const handleDownload = (file: ProjectFileRow) => {
    setError("");
    startDownloadTransition(async () => {
      const result = await getProjectFileDownloadUrl(projectId, file.id);

      if (result.error || !result.url) {
        setError(result.error ?? "Unable to download file.");
        return;
      }

      window.location.assign(result.url);
    });
  };

  const handleDelete = async (file: ProjectFileRow) => {
    const confirmed = window.confirm(`Delete ${file.file_stage} row ${file.workflow_slot}? The file will remain in history.`);
    if (!confirmed) return;

    setError("");
    setWorkingTarget(`${file.file_stage}-${file.workflow_slot}-delete`);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setError(userError?.message ?? "You must be signed in to delete files.");
      setWorkingTarget("");
      return;
    }

    const impactedFiles = files.filter(
      (item) =>
        item.workflow_slot === file.workflow_slot &&
        item.is_current_version &&
        getStageOrder(item.file_stage) >= getStageOrder(file.file_stage)
    );

    for (const impactedFile of impactedFiles) {
      const { error: updateError } = await supabase
        .from("project_files")
        .update({
          is_current_version: false,
          deleted_at: new Date().toISOString(),
          deleted_by: getUserLabel(user),
        })
        .eq("id", impactedFile.id);

      if (updateError) {
        setError(`${impactedFile.file_name}: ${getProjectFilesErrorMessage(updateError.message)}`);
        continue;
      }

      await insertAuditEvent(
        supabase,
        user,
        impactedFile,
        getAuditAction(impactedFile.file_stage, "deleted")
      );
      await insertChatMessage(supabase, user, impactedFile, "deleted");
    }

    setWorkingTarget("");
    await refreshFiles();
    onActivityChange?.();
  };

  const canUploadStage = (row: WorkflowRow, stage: ProjectFileStage) => {
    if (stage === "PCM") return true;
    if (stage === "Costing") return Boolean(row.PCM);
    return Boolean(row.Costing) && !isNewer(row.PCM, row.Costing);
  };

  const getRowWarnings = (row: WorkflowRow) => {
    const warnings: string[] = [];
    if (isNewer(row.PCM, row.Costing)) {
      warnings.push("PCM updated after Costing upload");
    }
    if (isNewer(row.Costing, row.Final)) {
      warnings.push("Costing updated after Final upload");
    }
    return warnings;
  };

  const getWorkflowStatus = (row: WorkflowRow) => {
    if (!row.PCM) return "Waiting PCM";
    if (!row.Costing) return "Waiting Costing";
    if (isNewer(row.PCM, row.Costing)) return "Costing Outdated";
    if (!row.Final) return "Waiting Final";
    if (isNewer(row.Costing, row.Final)) return "Final Outdated";
    return "Final Completed";
  };

  const getStatusClasses = (status: string) => {
    if (status.includes("Outdated")) return "bg-amber-100 text-amber-800";
    if (status.includes("Completed")) return "bg-emerald-100 text-emerald-700";
    if (status.includes("Uploaded")) return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-700";
  };

  const renderUploadInput = (
    stage: ProjectFileStage,
    slot: number,
    action: WorkflowAction,
    multiple = false
  ) => (
    <input
      ref={(element) => {
        inputRefs.current[getCellInputKey(stage, slot, action)] = element;
      }}
      type="file"
      multiple={multiple}
      accept=".pdf,.doc,.docx,.xls,.xlsx"
      className="hidden"
      onChange={(event) => handleFileInput(event, stage, slot, action)}
    />
  );

  const renderFileNotesDrawer = () => {
    if (!selectedNoteFile) return null;

    const file = selectedNoteFile;
    const fileNotes = notesByFileId[file.id] ?? [];
    const latestNote = fileNotes[0];
    const isSaving = workingTarget === `${file.id}-note`;

    return (
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
        aria-label="File notes"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">File notes</p>
            <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{file.file_name}</h3>
            {latestNote ? (
              <p className="mt-1 text-xs text-slate-500">
                Latest note on {formatDateTime(latestNote.created_at)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedNoteFileId("");
              setEditingNoteId("");
              setEditNoteDraft("");
            }}
            className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {file.file_stage}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Row {file.workflow_slot}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                v{file.version_number}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Uploaded by {file.uploaded_by ?? "Unknown user"} on {formatDateTime(file.uploaded_at)}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Notes</p>
            {fileNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No notes yet.
              </div>
            ) : (
              fileNotes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const isUpdating = workingTarget === `${note.id}-edit-note`;
                const isDeleting = workingTarget === `${note.id}-delete-note`;

                return (
                  <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editNoteDraft}
                          onChange={(event) => setEditNoteDraft(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isUpdating || !editNoteDraft.trim()}
                            onClick={() => handleUpdateNote(note)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId("");
                              setEditNoteDraft("");
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="break-words text-sm leading-6 text-slate-700">{note.note}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDateTime(note.created_at)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditNoteDraft(note.note);
                            }}
                            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteNote(note)}
                            className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Add note</p>
            <textarea
              value={noteDrafts[file.id] ?? ""}
              onChange={(event) =>
                setNoteDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [file.id]: event.target.value,
                }))
              }
              rows={4}
              maxLength={2000}
              placeholder="Add a note..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />

            <button
              type="button"
              disabled={isSaving || !(noteDrafts[file.id] ?? "").trim()}
              onClick={() => handleSaveNote(file)}
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save note"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFileCell = (row: WorkflowRow, stage: ProjectFileStage) => {
    const file = row[stage];
    const uploadKey = getCellInputKey(stage, row.slot, "upload");
    const replaceKey = getCellInputKey(stage, row.slot, "replace");
    const menuKey = `${stage}-${row.slot}-menu`;
    const canUpload = canUploadStage(row, stage);
    const isUploading = workingTarget === uploadKey;
    const isReplacing = workingTarget === replaceKey;
    const isDeleting = file ? workingTarget === `${file.file_stage}-${file.workflow_slot}-delete` : false;
    const isActiveDrop = dragTarget === uploadKey;
    const hasHistory = files.some(
      (item) => item.workflow_slot === row.slot && item.file_stage === stage
    );
    const warning =
      stage === "Costing" && isNewer(row.PCM, row.Costing)
        ? "Costing may be outdated"
        : stage === "Final" && isNewer(row.Costing, row.Final)
          ? "Final file may be outdated"
          : "";
    const noteCount = file ? (notesByFileId[file.id] ?? []).length : 0;

    if (file) {
      return (
        <div className="relative flex min-w-0 flex-col gap-3">
          {renderUploadInput(stage, row.slot, "replace")}
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedNoteFileId(file.id);
                  setOpenMenuTarget("");
                  setEditingNoteId("");
                  setEditNoteDraft("");
                }}
                className="block min-w-0 truncate text-left text-sm font-semibold text-sky-700 transition hover:text-sky-800 hover:underline"
                title="Open file notes"
              >
                {file.file_name}
              </button>
              {noteCount > 0 ? (
                <span
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                  title={`${noteCount} file ${noteCount === 1 ? "note" : "notes"}`}
                >
                  Notes {noteCount}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                v{file.version_number}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                Current
              </span>
              {warning ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {warning}
                </span>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              {formatFileSize(file.file_size)} - Uploaded by {file.uploaded_by ?? "Unknown user"} on {formatDateTime(file.uploaded_at)}
            </p>
          </div>

          <div className="relative w-fit">
            <button
              type="button"
              onClick={() => setOpenMenuTarget(openMenuTarget === menuKey ? "" : menuKey)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-expanded={openMenuTarget === menuKey}
            >
              Actions
            </button>
            {openMenuTarget === menuKey ? (
              <div className="absolute left-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => {
                    setOpenMenuTarget("");
                    handleDownload(file);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={isReplacing || isDeleting}
                  onClick={() => {
                    setOpenMenuTarget("");
                    inputRefs.current[replaceKey]?.click();
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReplacing ? "Replacing..." : "Replace"}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setOpenMenuTarget("");
                    handleDelete(file);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuTarget("");
                    setHistoryTarget({ stage, slot: row.slot });
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View history
                </button>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (canUpload) setDragTarget(uploadKey);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (canUpload) setDragTarget(uploadKey);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragTarget("");
        }}
        onDrop={(event) => canUpload ? handleDrop(event, stage, row.slot) : event.preventDefault()}
        className={`rounded-2xl border border-dashed p-4 transition ${
          canUpload
            ? isActiveDrop
              ? "border-sky-400 bg-sky-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400"
            : "border-slate-200 bg-slate-50 opacity-60"
        }`}
      >
        {renderUploadInput(stage, row.slot, "upload")}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-900">
            {canUpload ? `Upload ${stage}` : stage === "Costing" ? "Waiting for row PCM" : "Waiting for row Costing"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canUpload || isUploading}
              onClick={() => inputRefs.current[uploadKey]?.click()}
              className="w-fit rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Choose file"}
            </button>
            {hasHistory ? (
              <button
                type="button"
                onClick={() => setHistoryTarget({ stage, slot: row.slot })}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View history
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Files</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">PCM - Costing - Final</h2>
        </div>
        <div>
          <input
            ref={addPcmInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(event) => handleFileInput(event, "PCM", nextSlot, "upload")}
          />
          <button
            type="button"
            disabled={Boolean(workingTarget)}
            onClick={() => addPcmInputRef.current?.click()}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add PCM file
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200">
        {loading ? (
          <div className="px-4 py-4 text-sm text-slate-600 sm:px-5">Loading files...</div>
        ) : (
          <table className="min-w-[1250px] border-collapse text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="w-16 px-5 py-4">#</th>
                <th className="w-44 px-5 py-4">Status</th>
                {stages.map((stage) => (
                  <th key={stage} className="px-5 py-4">{stage}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {displayRows.map((row) => {
                const warnings = getRowWarnings(row);
                const status = getWorkflowStatus(row);

                return (
                  <tr
                    key={row.slot}
                    className={`align-top ${warnings.length > 0 ? "bg-amber-50/70" : ""}`}
                  >
                    <td className="px-5 py-5 text-sm font-semibold text-slate-500">{row.slot}</td>
                    <td className="px-5 py-5">
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                        {status}
                      </span>
                    </td>
                    {stages.map((stage) => (
                      <td key={stage} className="min-w-[330px] px-5 py-5">
                        {renderFileCell(row, stage)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderFileNotesDrawer()}

      {historyTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <section className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">History</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {historyTarget.stage} row {historyTarget.slot}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {historyFiles.length === 0 ? (
                <p className="text-sm text-slate-600">No file history yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyFiles.map((file) => (
                    <div key={file.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{file.file_name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            v{file.version_number} - {file.is_current_version ? "Current" : file.deleted_at ? "Deleted" : "Inactive"} - Uploaded by {file.uploaded_by ?? "Unknown user"} on {formatDateTime(file.uploaded_at)}
                          </p>
                          {file.deleted_at ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Deleted by {file.deleted_by ?? "Unknown user"} on {formatDateTime(file.deleted_at)}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() => handleDownload(file)}
                          className="w-fit shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
