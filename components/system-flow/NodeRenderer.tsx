"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ArchitectureFlowNode, ArchitectureNodeData } from "@/lib/graph-generator";

const typeClasses: Record<ArchitectureNodeData["type"], string> = {
  page: "border-cyan-300/60 bg-cyan-950/70 text-cyan-50 shadow-cyan-500/20",
  layout: "border-blue-300/60 bg-blue-950/70 text-blue-50 shadow-blue-500/20",
  component: "border-fuchsia-300/50 bg-fuchsia-950/50 text-fuchsia-50 shadow-fuchsia-500/20",
  database: "border-emerald-300/50 bg-emerald-950/50 text-emerald-50 shadow-emerald-500/20",
  storage: "border-orange-300/60 bg-orange-950/50 text-orange-50 shadow-orange-500/20",
  api: "border-red-300/50 bg-red-950/50 text-red-50 shadow-red-500/20",
  email: "border-yellow-300/50 bg-yellow-950/40 text-yellow-50 shadow-yellow-500/20",
  audit: "border-slate-300/50 bg-slate-900/80 text-slate-50 shadow-slate-400/20",
  workflow: "border-teal-300/60 bg-teal-950/60 text-teal-50 shadow-teal-400/20",
};

export default function NodeRenderer({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  return (
    <div
      className={`w-[252px] rounded-lg border px-4 py-3 font-mono shadow-lg backdrop-blur transition ${
        typeClasses[data.type]
      } ${data.critical ? "shadow-[0_0_28px_rgba(34,211,238,0.28)]" : ""} ${
        selected ? "ring-2 ring-cyan-200" : ""
      } ${data.highlighted ? "ring-2 ring-sky-300" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!border-cyan-200 !bg-cyan-300" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide">{data.name}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            {data.layer ?? data.type}
          </p>
        </div>
        {data.highlighted ? (
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
        ) : null}
      </div>
      {data.route ? <p className="mt-2 truncate text-xs text-cyan-100/70">{data.route}</p> : null}
      {data.userActions?.length ? (
        <p className="mt-2 truncate text-[11px] text-slate-200/70">
          {data.userActions.slice(0, 2).join(" / ")}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!border-cyan-200 !bg-cyan-300" />
    </div>
  );
}
