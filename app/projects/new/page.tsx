"use client";

import { useActionState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { createProject } from "../actions";

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState(createProject, { error: "" });

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar currentPage="projects" />

        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <Link href="/projects" className="inline-flex text-sky-600 hover:underline mb-4">
              Back to projects
            </Link>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">New project</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a new project</h1>
          </div>

          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <form className="space-y-6" action={formAction}>
              {state.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {state.error}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Project name</label>
                <input
                  type="text"
                  name="project_name"
                  placeholder="e.g., Japan Tour 2026"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Agent</label>
                <input
                  type="text"
                  name="agent"
                  placeholder="e.g., Wendy Wu"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <select
                  name="status"
                  defaultValue="Product"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="Product">Product</option>
                  <option value="Finance">Finance</option>
                  <option value="Contracting">Contracting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Channel</label>
                <input
                  type="text"
                  name="channel"
                  placeholder="General"
                  defaultValue="General"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Enter a brief project description"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Progress</label>
                <select
                  name="progress"
                  defaultValue="0"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="0">0%</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Creating project..." : "Create project"}
                </button>
                <Link
                  href="/projects"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
