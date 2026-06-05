"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { Project, mapProjectRow } from "@/lib/types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setProjects([]);
      } else {
        setProjects(data.map(mapProjectRow));
      }

      setLoading(false);
    };

    fetchProjects();
  }, []);

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const pendingApprovals = projects.filter((project) => project.status !== "Completed").length;
    const completedProjects = projects.filter((project) => project.status === "Completed").length;
    const delayedProjects = projects.filter((project) => {
      if (project.status === "Completed") {
        return false;
      }

      const deadline = new Date(project.deadline_raw);
      return !Number.isNaN(deadline.getTime()) && deadline < new Date();
    }).length;

    return {
      totalProjects,
      pendingApprovals,
      completedProjects,
      delayedProjects,
    };
  }, [projects]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar currentPage="dashboard" />

        <div className="min-w-0 space-y-6">
          <DashboardHeader />

          <div className="grid min-w-0 gap-6 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Total projects" value={String(stats.totalProjects)} note="Projects in Supabase" accent="blue" />
            <StatCard label="Pending approvals" value={String(stats.pendingApprovals)} note="Projects not completed" accent="gray" />
            <StatCard label="Completed projects" value={String(stats.completedProjects)} note="Projects marked completed" accent="black" />
            <StatCard label="Delayed projects" value={String(stats.delayedProjects)} note="Past deadline and active" accent="blue" />
          </div>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Recent projects</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Current initiatives</h2>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Agent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Deadline</th>
                    <th className="px-6 py-4">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-slate-600">
                        Loading projects...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-5 text-slate-600">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    projects.slice(0, 6).map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-medium text-slate-900">{project.name}</td>
                        <td className="px-6 py-5 text-slate-600">{project.agent}</td>
                        <td className="px-6 py-5">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-5 text-slate-600">{project.deadline}</td>
                        <td className="px-6 py-5 text-slate-600">{project.progress}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
