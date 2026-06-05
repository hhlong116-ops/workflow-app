"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectFileAuditEventRow } from "@/lib/types";

type ProjectActivityTimelineProps = {
  projectId: string;
  refreshKey?: number;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActionClasses(action: string) {
  if (action.includes("deleted")) return "bg-red-100 text-red-700";
  if (action.includes("replaced")) return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

export default function ProjectActivityTimeline({
  projectId,
  refreshKey = 0,
}: ProjectActivityTimelineProps) {
  const [events, setEvents] = useState<ProjectFileAuditEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_file_audit_events")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setError(error.message);
        setEvents([]);
      } else {
        setEvents(data);
      }

      setLoading(false);
    };

    loadEvents();
  }, [projectId, refreshKey]);

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Activity</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Project timeline</h2>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-slate-600">Loading activity...</p>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-600">No file activity yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getActionClasses(event.action)}`}>
                        {event.action}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        Row {event.workflow_slot}
                      </span>
                      {event.version_number ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          v{event.version_number}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-slate-900">
                      {event.file_name ?? `${event.file_stage} file`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      By {event.actor_label ?? "Unknown user"} on {formatDateTime(event.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
