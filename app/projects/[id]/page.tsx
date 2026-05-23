"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import StatusBadge from "../../components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectRow, mapProjectRow } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.from<ProjectRow>("projects").select("*").eq("id", id).single();

      if (error) {
        setError(error.message);
        setProject(null);
      } else if (data) {
        setProject(mapProjectRow(data));
      }
      setLoading(false);
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Sidebar currentPage="projects" />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">Loading project...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Sidebar currentPage="projects" />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Link href="/projects" className="text-sky-600 hover:underline">
              ← Back to projects
            </Link>
            <p className="mt-4 text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Sidebar currentPage="projects" />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Link href="/projects" className="text-sky-600 hover:underline">
              ← Back to projects
            </Link>
            <p className="mt-4 text-slate-900">Project not found</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar currentPage="projects" />

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Link href="/projects" className="inline-flex text-sky-600 hover:underline mb-4">
              ← Back to projects
            </Link>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Project details</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{project.name}</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Overview</h2>
                  <p className="text-slate-700">{project.description}</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Team</h2>
                  <p className="text-slate-600">Managed by <span className="font-semibold text-slate-900">{project.agent}</span></p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Progress</h2>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div style={{ width: project.progress }} className="h-3 rounded-full bg-sky-500"></div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{project.progress} complete</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <div className="mt-2">
                    <StatusBadge status={project.status} />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Deadline</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{project.deadline}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Agent</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{project.agent}</p>
                </div>
              </div>

              <button className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Edit project
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
