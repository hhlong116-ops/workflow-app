"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardHeader from "../components/DashboardHeader";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { Project, mapProjectRow } from "@/lib/types";

type SortKey = "project" | "agent" | "status" | "deadline" | "progress";
type SortDirection = "asc" | "desc";

function getDashboardStatus(project: Project) {
  if (project.status === "Completed") {
    return "Done";
  }

  const deadline = new Date(project.deadline_raw);
  if (!Number.isNaN(deadline.getTime()) && deadline < new Date()) {
    return "Overdue";
  }

  return "Pending";
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getProgressValue(progress: string) {
  return Number(progress.replace("%", "")) || 0;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("project");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsSignedIn(Boolean(user?.id && !user.is_anonymous));

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

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const compactQuery = normalizeSearchText(searchQuery);

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const dashboardStatus = getDashboardStatus(project);
      const searchableText = [
        project.name,
        project.agent,
        project.status,
        dashboardStatus,
        project.deadline,
        project.progress,
      ]
        .join(" ")
        .toLowerCase();
      const compactSearchableText = normalizeSearchText(searchableText);

      return searchableText.includes(query) || compactSearchableText.includes(compactQuery);
    });
  }, [projects, searchQuery]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((leftProject, rightProject) => {
      let result = 0;

      if (sortKey === "deadline") {
        result =
          new Date(leftProject.deadline_raw).getTime() -
          new Date(rightProject.deadline_raw).getTime();
      } else if (sortKey === "progress") {
        result = getProgressValue(leftProject.progress) - getProgressValue(rightProject.progress);
      } else {
        const leftValue =
          sortKey === "project"
            ? leftProject.name
            : sortKey === "agent"
              ? leftProject.agent
              : getDashboardStatus(leftProject);
        const rightValue =
          sortKey === "project"
            ? rightProject.name
            : sortKey === "agent"
              ? rightProject.agent
              : getDashboardStatus(rightProject);

        result = leftValue.localeCompare(rightValue, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredProjects, sortDirection, sortKey]);

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) => currentDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, nextSortKey: SortKey) => {
    const isActive = sortKey === nextSortKey;

    return (
      <button
        type="button"
        onClick={() => handleSort(nextSortKey)}
        className="inline-flex items-center gap-1.5 font-semibold text-slate-500 transition hover:text-slate-900"
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className={`text-xs leading-none ${isActive ? "text-slate-900" : "text-slate-300"}`}>
          {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  };

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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Projects</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Current initiatives</h2>
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <label className="block w-full min-w-0 sm:w-80">
                  <span className="sr-only">Search projects</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search projects or agents"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                {isSignedIn ? (
                  <Link
                    href="/projects/new"
                    className="inline-flex w-fit rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-300"
                  >
                    + New project
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">{renderSortHeader("Project", "project")}</th>
                    <th className="px-6 py-4">{renderSortHeader("Agent", "agent")}</th>
                    <th className="px-6 py-4">{renderSortHeader("Status", "status")}</th>
                    <th className="px-6 py-4">{renderSortHeader("Deadline", "deadline")}</th>
                    <th className="px-6 py-4">{renderSortHeader("Progress", "progress")}</th>
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
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-5 text-slate-600">
                        No matching projects found.
                      </td>
                    </tr>
                  ) : (
                    sortedProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 font-medium text-slate-900">{project.name}</td>
                        <td className="px-6 py-5 text-slate-600">{project.agent}</td>
                        <td className="px-6 py-5">
                          <StatusBadge status={getDashboardStatus(project)} />
                        </td>
                        <td className="px-6 py-5 text-slate-600">{project.deadline}</td>
                        <td className="px-6 py-5 text-slate-600">{project.progress}</td>
                        <td className="px-6 py-5">
                          <Link href={`/projects/${project.id}`} className="text-sm font-medium text-sky-600 hover:underline">
                            View project
                          </Link>
                        </td>
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
