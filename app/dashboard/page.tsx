"use client";

import DashboardHeader from "../components/DashboardHeader";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { useProjects } from "../lib/projects-context";

export default function Dashboard() {
  const { projects } = useProjects();
  const selectedProject = projects[0];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <Sidebar currentPage="dashboard" />

        <div className="space-y-6">
          <DashboardHeader />

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total projects" value="24" note="Active programs under review" accent="blue" />
            <StatCard label="Pending approvals" value="5" note="Finance and contracting items" accent="gray" />
            <StatCard label="Completed milestones" value="18" note="Delivered this quarter" accent="black" />
            <StatCard label="Delayed tasks" value="2" note="Escalations in flight" accent="blue" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Recent projects</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Current initiatives</h2>
                </div>
                <p className="text-sm text-slate-500">Updated 10 minutes ago</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <table className="min-w-full border-collapse text-left text-sm">
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
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-medium text-slate-900">{project.name}</td>
                        <td className="px-6 py-5 text-slate-600">{project.agent}</td>
                        <td className="px-6 py-5">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-5 text-slate-600">{project.deadline}</td>
                        <td className="px-6 py-5 text-slate-600">{project.progress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Project details</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedProject.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">Managed by {selectedProject.agent}</p>
                </div>
                <div className="text-sm text-slate-500">{selectedProject.progress}</div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">Status</div>
                  <StatusBadge status={selectedProject.status} />
                </div>

                <div>
                  <div className="text-sm text-slate-500">Deadline</div>
                  <div className="mt-1 text-sm text-slate-700">{selectedProject.deadline}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Overview</div>
                  <p className="mt-2 text-sm text-slate-700">{selectedProject.description}</p>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-2">Progress</div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div style={{ width: selectedProject.progress }} className="h-2 rounded-full bg-sky-500"></div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
