"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProjectActivityTimeline from "../../components/ProjectActivityTimeline";
import ProjectChatBox from "../../components/ProjectChatBox";
import ProjectFilesPanel from "../../components/ProjectFilesPanel";
import Sidebar from "../../components/Sidebar";
import StatusBadge from "../../components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { Project, mapProjectRow } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityVersion, setActivityVersion] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
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
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
          <Sidebar currentPage="projects" showTip={false} className="xl:h-full" />

          <div className="flex min-w-0 flex-col gap-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <Link href="/projects" className="mb-3 inline-flex text-sm text-sky-600 hover:underline">
              ← Back to projects
            </Link>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Project details</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{project.name}</h1>
          </div>

          <div className="grid min-w-0 flex-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_240px] lg:items-start">
                <div>
                  <h2 className="mb-2 text-base font-semibold text-slate-900">Overview</h2>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-700">{project.description}</p>
                </div>

                <div>
                  <h2 className="mb-2 text-base font-semibold text-slate-900">Team</h2>
                  <p className="text-sm text-slate-600">Managed by <span className="font-semibold text-slate-900">{project.agent}</span></p>
                </div>

                <div>
                  <h2 className="mb-2 text-base font-semibold text-slate-900">Progress</h2>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div style={{ width: project.progress }} className="h-2 rounded-full bg-sky-500"></div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{project.progress} complete</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <div className="mt-1">
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

              <button className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Edit project
              </button>
            </div>
          </div>

          </div>
        </div>

        <div className="min-w-0">
          <ProjectFilesPanel
            projectId={project.id}
            onActivityChange={() => setActivityVersion((currentVersion) => currentVersion + 1)}
          />
        </div>

        <div className="min-w-0">
          <ProjectActivityTimeline projectId={project.id} refreshKey={activityVersion} />
        </div>
      </div>
      <ProjectChatBox projectId={project.id} />
    </main>
  );
}
