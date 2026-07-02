"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectInsert, ProjectRow } from "@/lib/types";

type CreateProjectState = {
  error: string;
};

type DownloadFileResult = {
  error?: string;
  url?: string;
};

type DeleteProjectResult = {
  error?: string;
  success?: boolean;
};

const validStatuses: ProjectRow["status"][] = [
  "Product",
  "Finance",
  "Contracting",
  "Completed",
];

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export async function createProject(
  _previousState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const projectName = getFormString(formData, "project_name");
  const agent = getFormString(formData, "agent");
  const channel = getFormString(formData, "channel") || "General";
  const deadline = getFormString(formData, "deadline");
  const status = getFormString(formData, "status") as ProjectRow["status"];
  const description = getFormString(formData, "description");
  const progress = Number(getFormString(formData, "progress") || "0");

  if (
    !projectName ||
    !agent ||
    !channel ||
    !description ||
    !isValidDateInput(deadline) ||
    !Number.isInteger(progress) ||
    progress < 0 ||
    progress > 100 ||
    !validStatuses.includes(status)
  ) {
    return { error: "Please fill in all required fields." };
  }

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data.user;

  if (userError) {
    return { error: `Unable to verify your session: ${userError.message}` };
  }

  if (!user?.id || user.is_anonymous) {
    redirect("/login");
  }

  const project: ProjectInsert = {
    project_name: projectName,
    agent,
    channel,
    deadline,
    status,
    description,
    progress,
    user_id: user.id,
  };

  const { error } = await supabase.from("projects").insert(project);

  if (error) {
    return { error: `Unable to create project: ${error.message}` };
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function getProjectFileDownloadUrl(
  projectId: string,
  fileId: string
): Promise<DownloadFileResult> {
  const supabase = await createClient();

  const { data: file, error: fileError } = await supabase
    .from("project_files")
    .select("storage_bucket, storage_path, project_id, user_id")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .single();

  if (fileError || !file) {
    return { error: fileError?.message ?? "File not found." };
  }

  const { data, error } = await supabase.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Unable to create download link." };
  }

  return { url: data.signedUrl };
}

export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data.user;

  if (userError) {
    return { error: `Unable to verify your session: ${userError.message}` };
  }

  if (!user?.id || user.is_anonymous) {
    return { error: "You must be signed in to delete projects." };
  }

  const { data: files, error: filesError } = await supabase
    .from("project_files")
    .select("storage_bucket, storage_path")
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (filesError) {
    return { error: `Unable to load project files: ${filesError.message}` };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: `Unable to delete project: ${error.message}` };
  }

  const filePaths = files?.map((file) => file.storage_path) ?? [];
  if (filePaths.length > 0) {
    const bucket = files?.[0]?.storage_bucket ?? "project-files";
    await supabase.storage.from(bucket).remove(filePaths);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return { success: true };
}
