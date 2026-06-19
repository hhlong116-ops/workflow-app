"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  onFitView: () => void;
  refreshing: boolean;
};

export default function SearchBar({
  value,
  onChange,
  onRefresh,
  onFitView,
  refreshing,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-cyan-300/20 bg-slate-950 p-4 font-mono shadow-[0_0_34px_rgba(8,145,178,0.14)] md:flex-row md:items-center md:justify-between">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Search architecture</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search nodes, routes, workflow, tables..."
          className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-50 outline-none transition placeholder:text-cyan-100/35 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onFitView}
          className="rounded-2xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-950/30"
        >
          Fit View
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Architecture"}
        </button>
      </div>
    </div>
  );
}
