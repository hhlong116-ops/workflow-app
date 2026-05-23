"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { createClient } from "@/lib/supabase/client";

export default function NewProjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    project_name: "",
    agent: "",
    channel: "General",
    deadline: "",
    status: "Product" as const,
    description: "",
    progress: "0%",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.project_name ||
      !formData.agent ||
      !formData.channel ||
      !formData.deadline ||
      !formData.status ||
      !formData.description ||
      !formData.progress
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user?.id) {
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("projects").insert([
      {
        project_name: formData.project_name,
        agent: formData.agent,
        channel: formData.channel,
        deadline: formData.deadline,
        status: formData.status,
        description: formData.description,
        progress: formData.progress,
        created_by: user.id,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setSuccess("Project created successfully. Redirecting to projects...");
    setLoading(false);

    setTimeout(() => {
      router.push("/projects");
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar currentPage="projects" />

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Link href="/projects" className="inline-flex text-sky-600 hover:underline mb-4">
              ← Back to projects
            </Link>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">New project</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create a new project</h1>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Project name</label>
                <input
                  type="text"
                  name="project_name"
                  placeholder="e.g., Japan Tour 2026"
                  value={formData.project_name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Agent</label>
                <input
                  type="text"
                  name="agent"
                  placeholder="e.g., Wendy Wu"
                  value={formData.agent}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
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
                  value={formData.channel}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter a brief project description"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Progress</label>
                <select
                  name="progress"
                  value={formData.progress}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="0%">0%</option>
                  <option value="25%">25%</option>
                  <option value="50%">50%</option>
                  <option value="75%">75%</option>
                  <option value="100%">100%</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating project..." : "Create project"}
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
