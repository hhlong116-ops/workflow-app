"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardHeader() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Welcome back, Operations Lead
        </h1>
      </div>

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative block w-full min-w-0 lg:w-80">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search clients, agents, projects"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="flex items-center gap-3 relative">
          <button aria-label="notifications" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
            <span className="text-xl">🔔</span>
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition relative"
            title={userEmail}
          >
            <span className="text-sm font-semibold">{getInitials(userEmail)}</span>
          </button>

          {showDropdown && (
            <div className="absolute top-16 right-0 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 min-w-56">
              <div className="px-4 py-3 border-b border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Account</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                {loading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
