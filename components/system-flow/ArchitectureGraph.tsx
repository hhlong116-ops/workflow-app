"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import SearchBar from "./SearchBar";
import NodeDetailPanel from "./NodeDetailPanel";
import NodeRenderer from "./NodeRenderer";
import type {
  ArchitectureLayer,
  ArchitectureFlowNode,
  ArchitectureGraph as ArchitectureGraphData,
  ArchitectureNodeData,
} from "@/lib/graph-generator";
import type { ArchitectureScanResult } from "@/lib/architecture-scanner";

type ArchitectureGraphProps = {
  initialGraph: ArchitectureGraphData;
  initialScan: ArchitectureScanResult;
};

const nodeTypes: NodeTypes = {
  architecture: NodeRenderer,
};

const layers: Array<{ name: ArchitectureLayer; description: string }> = [
  { name: "Pages", description: "User-facing routes" },
  { name: "App Layout / Components", description: "Reusable UI and interaction panels" },
  { name: "Workflow Stages", description: "PCM to approval lane" },
  { name: "Database Tables", description: "Supabase persistence" },
  { name: "Email / API Services", description: "Auth, storage, and refresh services" },
  { name: "Audit / Logging", description: "Traceability and activity" },
];

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function GraphCanvas({ initialGraph, initialScan }: ArchitectureGraphProps) {
  const reactFlow = useReactFlow<ArchitectureFlowNode>();
  const [nodes, setNodes] = useState(initialGraph.nodes);
  const [edges, setEdges] = useState(initialGraph.edges);
  const [scan, setScan] = useState(initialScan);
  const [query, setQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ArchitectureNodeData | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const visibleNodes = useMemo<ArchitectureFlowNode[]>(() => {
    const normalizedQuery = normalizeSearch(query);
    const connectedNodeIds = new Set<string>();

    if (selectedNodeId) {
      edges.forEach((edge) => {
        if (edge.source === selectedNodeId) connectedNodeIds.add(edge.target);
        if (edge.target === selectedNodeId) connectedNodeIds.add(edge.source);
      });
    }

    return nodes.map((node) => {
      const searchable = normalizeSearch(
        [
          node.data.name,
          node.data.type,
          node.data.filePath,
          node.data.route,
          node.data.layer,
          node.data.userActions?.join(" "),
          node.data.nextPages?.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
      );

      return {
        ...node,
        data: {
          ...node.data,
          highlighted: Boolean(normalizedQuery) && searchable.includes(normalizedQuery),
        },
        className:
          selectedNodeId && (node.id === selectedNodeId || connectedNodeIds.has(node.id))
            ? "opacity-100"
            : selectedNodeId
              ? "opacity-45"
              : undefined,
      };
    });
  }, [edges, nodes, query, selectedNodeId]);

  const visibleEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const isConnected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const isDimmed = selectedNodeId && !isConnected;

      return {
        ...edge,
        labelShowBg: true,
        zIndex: isConnected ? 20 : 0,
        style: {
          ...edge.style,
          stroke: isConnected ? "#a5f3fc" : "#38bdf8",
          strokeWidth: isConnected ? 3 : 1.8,
          opacity: isDimmed ? 0.22 : 1,
          filter: isConnected
            ? "drop-shadow(0 0 10px rgba(165,243,252,0.9))"
            : "drop-shadow(0 0 6px rgba(56,189,248,0.45))",
        },
        labelStyle: {
          ...edge.labelStyle,
          opacity: isDimmed ? 0.35 : 1,
        },
      };
    });
  }, [edges, selectedNodeId]);

  const handleNodesChange = useCallback((changes: NodeChange<ArchitectureFlowNode>[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const refreshGraph = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/system-flow", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to refresh architecture graph.");
      const data = await response.json() as {
        scan: ArchitectureScanResult;
        graph: ArchitectureGraphData;
      };
      setNodes(data.graph.nodes);
      setEdges(data.graph.edges);
      setScan(data.scan);
      setSelectedNode(undefined);
      setSelectedNodeId("");
      window.setTimeout(() => reactFlow.fitView({ padding: 0.2, duration: 300 }), 50);
    } finally {
      setRefreshing(false);
    }
  }, [reactFlow]);

  return (
    <div className="space-y-5">
      <SearchBar
        value={query}
        onChange={setQuery}
        onRefresh={refreshGraph}
        onFitView={() => reactFlow.fitView({ padding: 0.2, duration: 300 })}
        refreshing={refreshing}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[760px] overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#020817] shadow-[0_0_40px_rgba(8,145,178,0.16)]">
          <div className="grid gap-3 border-b border-cyan-300/15 bg-cyan-950/20 px-4 py-3 md:grid-cols-3 2xl:grid-cols-6">
            {layers.map((layer) => (
              <div key={layer.name} className="rounded-2xl border border-cyan-300/20 bg-slate-950/70 px-3 py-2 font-mono">
                <p className="text-xs font-semibold text-cyan-100">{layer.name}</p>
                <p className="mt-1 text-[11px] leading-4 text-cyan-100/55">{layer.description}</p>
              </div>
            ))}
          </div>
          <div className="h-[760px] bg-[radial-gradient(circle_at_1px_1px,rgba(103,232,249,0.18)_1px,transparent_0)] [background-size:22px_22px]">
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable
            panOnDrag
            zoomOnScroll
            onNodesChange={handleNodesChange}
            onNodeClick={(_, node) => {
              setSelectedNode(node.data);
              setSelectedNodeId(node.id);
            }}
            onPaneClick={() => {
              setSelectedNode(undefined);
              setSelectedNodeId("");
            }}
          >
            <Background color="rgba(34,211,238,0.18)" gap={28} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
          </div>
        </section>

        <NodeDetailPanel node={selectedNode} generatedAt={scan.generatedAt} />
      </div>
    </div>
  );
}

export default function ArchitectureGraph(props: ArchitectureGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
