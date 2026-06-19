import type { Edge, Node } from "@xyflow/react";
import type { ArchitectureItem, ArchitectureScanResult, ArchitectureItemType } from "./architecture-scanner";

export type ArchitectureLayer =
  | "Pages"
  | "App Layout / Components"
  | "Workflow Stages"
  | "Database Tables"
  | "Email / API Services"
  | "Audit / Logging";

export type ArchitectureNodeData = ArchitectureItem & {
  highlighted?: boolean;
  layer?: ArchitectureLayer;
  userActions?: string[];
  nextPages?: string[];
  critical?: boolean;
} & Record<string, unknown>;

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

export type ArchitectureGraph = {
  nodes: ArchitectureFlowNode[];
  edges: Edge[];
};

const nodeSize = {
  width: 252,
  height: 108,
};

const columns: Record<ArchitectureLayer, number> = {
  Pages: 0,
  "App Layout / Components": 430,
  "Workflow Stages": 860,
  "Database Tables": 1740,
  "Email / API Services": 2180,
  "Audit / Logging": 2620,
};

const workflowSteps = [
  "PCM File 1",
  "PCM File 2",
  "Finance Costing",
  "Contracting Update",
  "Final Costing",
  "Approved",
];

const routeActions: Record<string, string[]> = {
  "/login": ["Sign in", "Open signup"],
  "/signup": ["Create account", "Return to login"],
  "/dashboard": ["Search projects", "Sort projects", "View project"],
  "/tasks": ["Review tasks", "Open project"],
  "/projects": ["Browse projects", "Create project"],
  "/projects/new": ["Create project", "Cancel"],
  "/projects/:id": ["Upload files", "Write notes", "Chat", "Review activity"],
  "/system-flow": ["Inspect flow", "Refresh graph"],
};

function normalizeRoute(route: string) {
  return route.replace(/\[[^\]]+\]/g, (segment) => `:${segment.slice(1, -1)}`);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeItem(input: {
  id: string;
  name: string;
  type: ArchitectureItemType;
  layer: ArchitectureLayer;
  y: number;
  route?: string;
  filePath?: string;
  purpose: string;
  description: string;
  userActions?: string[];
  critical?: boolean;
}): ArchitectureFlowNode {
  return {
    id: input.id,
    type: "architecture",
    width: nodeSize.width,
    height: nodeSize.height,
    position: {
      x: columns[input.layer],
      y: input.y,
    },
    data: {
      id: input.id,
      name: input.name,
      type: input.type,
      layer: input.layer,
      route: input.route,
      filePath: input.filePath,
      purpose: input.purpose,
      description: input.description,
      userActions: input.userActions ?? [],
      nextPages: [],
      imports: [],
      components: [],
      apis: [],
      pageLinks: [],
      databaseTables: [],
      storageBuckets: [],
      dependencies: [],
      usedBy: [],
      critical: input.critical,
    },
  };
}

function makeEdge(source: string, target: string, label?: string, important = false): Edge {
  return {
    id: `${source}->${target}${label ? `:${label}` : ""}`,
    source,
    target,
    label,
    type: "smoothstep",
    markerEnd: { type: "arrowclosed", color: important ? "#67e8f9" : "#38bdf8" },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 8,
    labelBgStyle: { fill: "#06111f", fillOpacity: 0.94 },
    labelStyle: {
      fill: important ? "#a5f3fc" : "#7dd3fc",
      fontSize: 10,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontWeight: 600,
    },
    style: {
      stroke: important ? "#67e8f9" : "#38bdf8",
      strokeWidth: important ? 2.2 : 1.4,
      filter: important ? "drop-shadow(0 0 7px rgba(103,232,249,0.7))" : "drop-shadow(0 0 5px rgba(56,189,248,0.42))",
    },
  };
}

function findByFile(scan: ArchitectureScanResult, fileName: string) {
  return scan.items.find((item) => item.filePath?.endsWith(fileName));
}

function findPage(scan: ArchitectureScanResult, route: string) {
  return scan.items.find((item) => item.type === "page" && normalizeRoute(item.route ?? "") === route);
}

export async function generateArchitectureGraph(scan: ArchitectureScanResult): Promise<ArchitectureGraph> {
  const nodes: ArchitectureFlowNode[] = [];
  const edges: Edge[] = [];

  const pageRoutes = ["/login", "/signup", "/dashboard", "/tasks", "/projects", "/projects/new", "/projects/:id", "/system-flow"];
  pageRoutes.forEach((route, index) => {
    const page = findPage(scan, route);
    if (!page) return;
    nodes.push(makeItem({
      id: page.id,
      name: page.name,
      type: "page",
      layer: "Pages",
      y: index * 148,
      route,
      filePath: page.filePath,
      purpose: "Interactive user-facing route.",
      description: `${page.name} is a user-facing page in the application flow.`,
      userActions: routeActions[route],
      critical: route === "/dashboard" || route === "/projects/:id",
    }));
  });

  const componentFiles = [
    "app/layout.tsx",
    "app/components/Sidebar.tsx",
    "app/components/DashboardHeader.tsx",
    "app/components/ProjectFilesPanel.tsx",
    "app/components/ProjectChatBox.tsx",
    "app/components/ProjectActivityTimeline.tsx",
    "components/system-flow/ArchitectureGraph.tsx",
  ];
  componentFiles.forEach((filePath, index) => {
    const component = scan.items.find((item) => item.filePath === filePath) ?? findByFile(scan, filePath);
    const name = component?.name ?? titleCase(filePath.split("/").at(-1)?.replace(/\.(tsx|ts)$/, "") ?? filePath);
    nodes.push(makeItem({
      id: `component:${filePath}`,
      name,
      type: filePath.endsWith("layout.tsx") ? "layout" : "component",
      layer: "App Layout / Components",
      y: index * 148,
      filePath,
      purpose: "Shared UI and interaction layer.",
      description: `${name} supports page layout, navigation, or project interactions.`,
      critical: filePath.includes("ProjectFilesPanel"),
    }));
  });

  workflowSteps.forEach((step, index) => {
    nodes.push(makeItem({
      id: `workflow:${index}`,
      name: step,
      type: "workflow",
      layer: "Workflow Stages",
      y: 365,
      purpose: "PCM to costing to approval workflow stage.",
      description: `${step} is part of the core project file workflow.`,
      critical: index === 0 || index === workflowSteps.length - 1,
    }));
    nodes[nodes.length - 1].position.x = columns["Workflow Stages"] + index * 300;
  });

  const tableNames = ["projects", "project_files", "project_file_notes", "project_chat_messages"];
  tableNames.forEach((table, index) => {
    nodes.push(makeItem({
      id: `database:${table}`,
      name: `${titleCase(table)} Table`,
      type: "database",
      layer: "Database Tables",
      y: index * 168,
      purpose: "Supabase Postgres persistence.",
      description: `Stores ${table.replace(/_/g, " ")} records.`,
      critical: table === "projects" || table === "project_files",
    }));
  });

  const serviceNodes: Array<[string, string, ArchitectureItemType, string]> = [
    ["service:supabase-auth", "Supabase Auth", "email" as const, "User signup, sign-in, and session state."],
    ["storage:project-files", "Project Files Bucket", "storage" as const, "Stores uploaded PCM, Costing, and Final files."],
    ["api:system-flow", "System Flow API", "api" as const, "Refreshes the architecture map from source code."],
  ];
  serviceNodes.forEach(([id, name, type, description], index) => {
    nodes.push(makeItem({
      id,
      name,
      type,
      layer: "Email / API Services",
      y: index * 190,
      purpose: "External or server-side service dependency.",
      description,
      critical: id === "storage:project-files",
    }));
  });

  const auditNodes = [
    ["audit:file-events", "File Audit Events", "Records upload, replace, and delete actions."],
    ["audit:activity", "Activity Timeline", "Displays project audit activity to users."],
  ];
  auditNodes.forEach(([id, name, description], index) => {
    nodes.push(makeItem({
      id,
      name,
      type: "audit",
      layer: "Audit / Logging",
      y: index * 210,
      purpose: "Traceability and system history.",
      description,
      critical: id === "audit:file-events",
    }));
  });

  edges.push(
    makeEdge("page:/login", "service:supabase-auth", "auth", true),
    makeEdge("page:/signup", "service:supabase-auth", "account email", true),
    makeEdge("page:/login", "page:/dashboard", "sign in", true),
    makeEdge("page:/signup", "page:/login", "continue"),
    makeEdge("page:/dashboard", "component:app/components/Sidebar.tsx", "navigation"),
    makeEdge("page:/dashboard", "component:app/components/DashboardHeader.tsx", "header"),
    makeEdge("page:/dashboard", "database:projects", "reads"),
    makeEdge("page:/dashboard", "page:/projects/:id", "view project", true),
    makeEdge("page:/dashboard", "page:/tasks", "tasks"),
    makeEdge("page:/tasks", "database:project_files", "reads"),
    makeEdge("page:/tasks", "page:/projects/:id", "open project"),
    makeEdge("page:/projects", "database:projects", "reads"),
    makeEdge("page:/projects", "page:/projects/new", "create"),
    makeEdge("page:/projects/new", "database:projects", "creates", true),
    makeEdge("page:/projects/:id", "component:app/components/ProjectFilesPanel.tsx", "file workflow", true),
    makeEdge("page:/projects/:id", "component:app/components/ProjectChatBox.tsx", "chat"),
    makeEdge("page:/projects/:id", "component:app/components/ProjectActivityTimeline.tsx", "timeline"),
    makeEdge("component:app/components/ProjectFilesPanel.tsx", "workflow:0", "starts", true),
    makeEdge("workflow:0", "workflow:1", "next", true),
    makeEdge("workflow:1", "workflow:2", "finance", true),
    makeEdge("workflow:2", "workflow:3", "contracting", true),
    makeEdge("workflow:3", "workflow:4", "final", true),
    makeEdge("workflow:4", "workflow:5", "approve", true),
    makeEdge("component:app/components/ProjectFilesPanel.tsx", "database:project_files", "versions", true),
    makeEdge("component:app/components/ProjectFilesPanel.tsx", "database:project_file_notes", "notes"),
    makeEdge("component:app/components/ProjectFilesPanel.tsx", "storage:project-files", "uploads", true),
    makeEdge("component:app/components/ProjectFilesPanel.tsx", "audit:file-events", "audit", true),
    makeEdge("component:app/components/ProjectChatBox.tsx", "database:project_chat_messages", "messages"),
    makeEdge("component:app/components/ProjectActivityTimeline.tsx", "audit:activity", "reads"),
    makeEdge("audit:file-events", "database:project_file_notes", "context"),
    makeEdge("audit:file-events", "audit:activity", "display"),
    makeEdge("page:/system-flow", "component:components/system-flow/ArchitectureGraph.tsx", "renders"),
    makeEdge("component:components/system-flow/ArchitectureGraph.tsx", "api:system-flow", "refresh")
  );

  return {
    nodes,
    edges: [...new Map(edges.map((edge) => [edge.id, edge])).values()],
  };
}
