import Link from "next/link";

type SidebarProps = {
  currentPage?: "dashboard" | "projects" | "tasks" | "teams" | "settings";
};

const navItems = [
  { label: "Dashboard", key: "dashboard", href: "/dashboard" },
  { label: "Projects", key: "projects", href: "/projects" },
  { label: "My Tasks", key: "tasks", href: "/tasks" },
  { label: "Teams", key: "teams", href: "/teams" },
  { label: "Settings", key: "settings", href: "/settings" },
];

export default function Sidebar({ currentPage = "dashboard" }: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col gap-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          TravelOps
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          Internal dashboard
        </h2>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`text-left rounded-2xl px-4 py-3 transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200/70"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl bg-slate-50 p-4 text-slate-600">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Pro tip
        </p>
        <p className="mt-3 text-sm leading-6">
          Keep the travel workflow aligned with the latest project priorities.
        </p>
      </div>
    </aside>
  );
}
