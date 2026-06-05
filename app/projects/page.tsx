"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import StatusBadge from "../components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { Project, mapProjectRow } from "@/lib/types";
import { deleteProject } from "./actions";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else if (data) {
        setProjects(data.map(mapProjectRow));
      }
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const handleDeleteProject = (project: Project) => {
    const confirmed = window.confirm(`Delete "${project.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(project.id);

    startTransition(async () => {
      const result = await deleteProject(project.id);

      if (result.error) {
        setError(result.error);
      } else {
        setProjects((currentProjects) =>
          currentProjects.filter((currentProject) => currentProject.id !== project.id)
        );
      }

      setDeletingId("");
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar currentPage="projects" />

        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Projects</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">All projects</h1>
              </div>
              <Link
                href="/projects/new"
                className="inline-flex rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-300"
              >
                + New project
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Agent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Deadline</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-5 text-slate-600">
                        Loading projects...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-5 text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-5 text-slate-600">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-medium text-slate-900">{project.name}</td>
                        <td className="px-6 py-5 text-slate-600">{project.agent}</td>
                        <td className="px-6 py-5">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-5 text-slate-600">{project.deadline}</td>
                        <td className="px-6 py-5 text-slate-600">{project.progress}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-3">
                            <Link href={`/projects/${project.id}`} className="text-sky-600 text-sm hover:underline">
                              View
                            </Link>
                            <button
                              type="button"
                              disabled={isPending && deletingId === project.id}
                              onClick={() => handleDeleteProject(project)}
                              className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === project.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
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
