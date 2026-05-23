type StatusBadgeProps = {
  status: string;
};

const statusMap: Record<string, string> = {
  Product: "bg-sky-100 text-sky-700",
  Finance: "bg-amber-100 text-amber-700",
  Contracting: "bg-indigo-100 text-indigo-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusMap[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
