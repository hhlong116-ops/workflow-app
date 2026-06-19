"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectFileRow } from "@/lib/types";
import { mapProjectRow } from "@/lib/types";

type TaskRow = {
  id: string;
  agent: string;
  projectId: string;
  projectName: string;
  subProject: string;
  slot: number;
  status: string;
};

const statusClasses: Record<string, string> = {
  Finance: "bg-sky-100 text-sky-700",
  Contracting: "bg-indigo-100 text-indigo-700",
  Product: "bg-amber-100 text-amber-800",
  Done: "bg-emerald-100 text-emerald-700",
};

function isNewer(left?: ProjectFileRow, right?: ProjectFileRow) {
  if (!left || !right) return false;
  return new Date(left.uploaded_at).getTime() > new Date(right.uploaded_at).getTime();
}

function getFinanceStageStatus(project: Project) {
  return project.status === "Contracting" ? "Contracting" : "Finance";
}

function getWorkflowStatus(project: Project, files: ProjectFileRow[], slot: number) {
  const pcm = files.find((file) => file.workflow_slot === slot && file.file_stage === "PCM");
  const costing = files.find((file) => file.workflow_slot === slot && file.file_stage === "Costing");
  const final = files.find((file) => file.workflow_slot === slot && file.file_stage === "Final");

  if (!pcm) return "Finance";
  if (!costing) return getFinanceStageStatus(project);
  if (isNewer(pcm, costing)) return "Finance";
  if (!final) return "Product";
  if (isNewer(costing, final)) return "Product";
  return "Done";
}

function buildTaskRows(projects: Project[], files: ProjectFileRow[]): TaskRow[] {
  const currentFiles = files.filter((file) => file.is_current_version);
  const filesByProject = new Map<string, ProjectFileRow[]>();

  currentFiles.forEach((file) => {
    const projectFiles = filesByProject.get(file.project_id) ?? [];
    projectFiles.push(file);
    filesByProject.set(file.project_id, projectFiles);
  });

  return projects.flatMap((project) => {
    const projectFiles = filesByProject.get(project.id) ?? [];
    const pcmFiles = projectFiles
      .filter((file) => file.file_stage === "PCM")
      .sort((left, right) => left.workflow_slot - right.workflow_slot);

    if (pcmFiles.length === 0) {
      return [
        {
          id: `${project.id}-waiting-pcm`,
          agent: project.agent,
          projectId: project.id,
          projectName: project.name,
          subProject: "No PCM file yet",
          slot: 0,
          status: "Finance",
        },
      ];
    }

    return pcmFiles.map((pcmFile) => ({
      id: pcmFile.id,
      agent: project.agent,
      projectId: project.id,
      projectName: project.name,
      subProject: pcmFile.file_name,
      slot: pcmFile.workflow_slot,
      status: getWorkflowStatus(project, projectFiles, pcmFile.workflow_slot),
    }));
  });
}

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const [{ data: projectRows, error: projectsError }, { data: fileRows, error: filesError }] =
        await Promise.all([
          supabase.from("projects").select("*").order("created_at", { ascending: false }),
          supabase
            .from("project_files")
            .select("*")
            .eq("is_current_version", true)
            .order("workflow_slot", { ascending: true }),
        ]);

      if (projectsError || filesError) {
        setError(projectsError?.message ?? filesError?.message ?? "Unable to load tasks.");
        setProjects([]);
        setFiles([]);
      } else {
        setProjects(projectRows.map(mapProjectRow));
        setFiles(fileRows);
      }

      setLoading(false);
    };

    fetchTasks();
  }, []);

  const taskRows = useMemo(() => buildTaskRows(projects, files), [projects, files]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar currentPage="tasks" />

        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">My Tasks</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">PCM task overview</h1>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Agent</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Sub-project</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-slate-600">
                        Loading tasks...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : taskRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-slate-600">
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                    taskRows.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 text-slate-600">{task.agent}</td>
                        <td className="px-6 py-5 font-medium text-slate-900">{task.projectName}</td>
                        <td className="px-6 py-5">
                          <div className="min-w-0">
                            <p className="max-w-md truncate font-medium text-slate-900">{task.subProject}</p>
                            {task.slot > 0 ? (
                              <p className="mt-1 text-xs text-slate-500">PCM row {task.slot}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClasses[task.status] ?? "bg-slate-100 text-slate-700"}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <Link href={`/projects/${task.projectId}`} className="text-sm font-medium text-sky-600 hover:underline">
                            View project
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
