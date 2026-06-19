import { NextResponse } from "next/server";
import { scanArchitecture } from "@/lib/architecture-scanner";
import { generateArchitectureGraph } from "@/lib/graph-generator";

export const dynamic = "force-dynamic";

export async function GET() {
  const scan = await scanArchitecture();
  const graph = await generateArchitectureGraph(scan);

  return NextResponse.json({
    scan,
    graph,
  });
}
