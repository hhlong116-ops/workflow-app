"use client";

import type { ArchitectureNodeData } from "@/lib/graph-generator";

type NodeDetailPanelProps = {
  node?: ArchitectureNodeData;
  generatedAt: string;
};

export default function NodeDetailPanel({ node, generatedAt }: NodeDetailPanelProps) {
  if (!node) {
    return (
      <aside className="rounded-3xl border border-cyan-300/20 bg-slate-950 p-5 font-mono shadow-[0_0_34px_rgba(8,145,178,0.14)]">
        <p className="text-sm font-semibold text-cyan-100">Node Details</p>
        <p className="mt-2 text-sm leading-6 text-cyan-100/60">
          Select a node to inspect its layer, purpose, file path, user actions, and downstream routes.
        </p>
        <p className="mt-4 text-xs text-cyan-100/40">
          Last scanned {new Date(generatedAt).toLocaleString()}
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-3xl border border-cyan-300/20 bg-slate-950 p-5 font-mono shadow-[0_0_34px_rgba(8,145,178,0.14)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
          {node.layer ?? node.type}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-cyan-50">{node.name}</h2>
        <p className="mt-3 text-sm leading-6 text-cyan-100/65">{node.description}</p>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">Purpose</p>
          <p className="mt-2 text-sm leading-6 text-cyan-100/65">{node.purpose}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">File Path</p>
          <p className="mt-2 break-words rounded-2xl border border-cyan-300/10 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100/70">
            {node.filePath ?? "Generated node"}
          </p>
        </div>

        {node.route ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">Route</p>
            <p className="mt-2 rounded-2xl border border-cyan-300/10 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100/70">{node.route}</p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">User Actions</p>
          {node.userActions?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {node.userActions.map((value) => (
                <span key={value} className="rounded-full border border-cyan-300/20 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-100/75">
                  {value}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-cyan-100/45">No actions configured</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">Next Pages</p>
          {node.nextPages?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {node.nextPages.map((value) => (
                <span key={value} className="rounded-full border border-sky-300/20 bg-sky-950/40 px-3 py-1 text-xs font-semibold text-sky-100/75">
                  {value}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-cyan-100/45">No next page configured</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">Last Modified</p>
          <p className="mt-2 text-sm text-cyan-100/50">
            {node.lastModified ? new Date(node.lastModified).toLocaleString() : "Not applicable"}
          </p>
        </div>
      </div>
    </aside>
  );
}
