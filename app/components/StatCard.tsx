type StatCardProps = {
  label: string;
  value: string;
  note?: string;
  accent?: "blue" | "gray" | "black";
};

const accentClasses: Record<string, string> = {
  blue: "bg-sky-500",
  gray: "bg-slate-500",
  black: "bg-slate-900",
};

export default function StatCard({ label, value, note, accent = "blue" }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-2xl ${accentClasses[accent]} bg-opacity-10`} />
      </div>
      {note ? <p className="mt-4 text-sm text-slate-500">{note}</p> : null}
    </div>
  );
}
