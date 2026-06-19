import ArchitectureGraph from "@/components/system-flow/ArchitectureGraph";
import { scanArchitecture } from "@/lib/architecture-scanner";
import { generateArchitectureGraph } from "@/lib/graph-generator";

export const dynamic = "force-dynamic";

export default async function SystemFlowPage() {
  const scan = await scanArchitecture();
  const graph = await generateArchitectureGraph(scan);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_30%),linear-gradient(135deg,#020617,#07111f_45%,#020617)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-300/70">System Flow</p>
          <h1 className="mt-2 text-3xl font-semibold text-cyan-50">Architecture Explorer</h1>
          <p className="mt-3 max-w-3xl font-mono text-sm leading-6 text-cyan-100/60">
            Neon technical architecture map showing pages, components, workflow routing, data tables, services, and audit paths.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Visible Nodes" value={graph.nodes.length} />
          <MetricCard label="Wiring Paths" value={graph.edges.length} />
          <MetricCard label="Architecture Layers" value={6} />
          <MetricCard label="Workflow Stages" value={6} />
        </div>

        <ArchitectureGraph initialGraph={graph} initialScan={scan} />
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-slate-950/80 p-4 font-mono shadow-[0_0_30px_rgba(8,145,178,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/50">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-cyan-50">{value}</p>
    </div>
  );
}
