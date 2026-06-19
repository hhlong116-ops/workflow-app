import { stat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ArchitectureItemType =
  | "page"
  | "layout"
  | "api"
  | "component"
  | "database"
  | "storage"
  | "email"
  | "audit"
  | "workflow";

export type ArchitectureItem = {
  id: string;
  name: string;
  type: ArchitectureItemType;
  purpose: string;
  filePath?: string;
  route?: string;
  imports: string[];
  components: string[];
  apis: string[];
  pageLinks: string[];
  databaseTables: string[];
  storageBuckets: string[];
  dependencies: string[];
  usedBy: string[];
  lastModified?: string;
  description: string;
};

export type ArchitectureScanResult = {
  generatedAt: string;
  items: ArchitectureItem[];
  metrics: {
    totalPages: number;
    totalComponents: number;
    totalApis: number;
    totalDatabaseTables: number;
    totalStorageBuckets: number;
  };
};

type SourceFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
  modifiedAt: string;
};

const scanRoots = [
  path.join(process.cwd(), "app"),
  path.join(process.cwd(), "components"),
  path.join(process.cwd(), "lib"),
  path.join(process.cwd(), "hooks"),
  path.join(process.cwd(), "actions"),
  path.join(process.cwd(), "api"),
];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function toTitle(input: string) {
  return input
    .replace(/\[[^\]]+\]/g, "Detail")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function routeFromPage(relativePath: string) {
  const route = relativePath
    .replace(/\\/g, "/")
    .replace(/^app\//, "/")
    .replace(/\/page\.(tsx|ts|jsx|js)$/, "")
    .replace(/\(.*?\)\//g, "")
    .replace(/\[([^\]]+)\]/g, ":$1");

  return route === "" ? "/" : route;
}

function routeFromApi(relativePath: string) {
  const route = relativePath
    .replace(/\\/g, "/")
    .replace(/^app\//, "/")
    .replace(/\/route\.(tsx|ts|jsx|js)$/, "")
    .replace(/\[([^\]]+)\]/g, ":$1");

  return route;
}

function nameFromRoute(route: string, fallback: string) {
  if (route === "/") return "Home";
  const segments = route.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? fallback;

  if (lastSegment.startsWith(":")) {
    return `${toTitle(segments.at(-2) ?? fallback).replace(/s$/, "")} Detail`;
  }

  if (lastSegment === "new") {
    return `New ${toTitle(segments.at(-2) ?? fallback).replace(/s$/, "")}`;
  }

  return toTitle(lastSegment.replace(/^:/, ""));
}

function getImports(content: string) {
  const imports = new Set<string>();
  const importRegex = /import\s+(?:[^'"]+?\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content))) {
    imports.add(match[1]);
  }

  return [...imports];
}

function getSupabaseTables(content: string) {
  return [...content.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((match) => match[1]);
}

function getStorageBuckets(content: string) {
  return [...content.matchAll(/\.storage\s*\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((match) => match[1]);
}

function getApiCalls(content: string) {
  return [...content.matchAll(/fetch\(\s*["'`]([^"'`]*\/api\/[^"'`]+)["'`]/g)].map((match) => match[1]);
}

function getPageLinks(content: string) {
  const links = [
    ...content.matchAll(/href=["'`]((?:\/(?!api\/))[^"'`]+)["'`]/g),
    ...content.matchAll(/router\.(?:push|replace)\(\s*["'`]((?:\/(?!api\/))[^"'`]+)["'`]/g),
    ...content.matchAll(/redirect\(\s*["'`]((?:\/(?!api\/))[^"'`]+)["'`]/g),
  ].map((match) => match[1].split("?")[0]);

  return [...new Set(links)];
}

function getReferencedComponents(content: string, componentNames: string[]) {
  return componentNames.filter((name) => new RegExp(`<${name}(\\s|>|/)`).test(content));
}

function isEmailRelated(content: string) {
  return /email|mailer|notification|sendgrid|resend|smtp/i.test(content);
}

function isAuditRelated(content: string) {
  return /audit|project_file_audit_events/i.test(content);
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(rootDir: string, currentDir: string, output: SourceFile[]) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;

    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(rootDir, absolutePath, output);
      continue;
    }

    if (!sourceExtensions.has(path.extname(entry.name))) continue;

    const [content, fileStat] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath),
    ]);

    output.push({
      absolutePath,
      relativePath: path.relative(rootDir, absolutePath).replace(/\\/g, "/"),
      content,
      modifiedAt: fileStat.mtime.toISOString(),
    });
  }
}

export async function scanArchitecture(): Promise<ArchitectureScanResult> {
  const rootDir = process.cwd();
  const files: SourceFile[] = [];

  for (const absoluteRoot of scanRoots) {
    if (await pathExists(absoluteRoot)) {
      await collectFiles(rootDir, absoluteRoot, files);
    }
  }

  const componentFiles = files.filter(
    (file) =>
      file.relativePath.endsWith(".tsx") &&
      !file.relativePath.endsWith("/page.tsx") &&
      !file.relativePath.endsWith("/layout.tsx") &&
      !file.relativePath.endsWith("/route.ts")
  );
  const componentNames = componentFiles.map((file) => path.basename(file.relativePath, path.extname(file.relativePath)));
  const items: ArchitectureItem[] = [];

  for (const file of files) {
    const imports = getImports(file.content);
    const databaseTables = [...new Set(getSupabaseTables(file.content))];
    const storageBuckets = [...new Set(getStorageBuckets(file.content))];
    const apis = [...new Set(getApiCalls(file.content))];
    const pageLinks = getPageLinks(file.content);
    const components = getReferencedComponents(file.content, componentNames);
    const dependencies = imports.filter((item) => !item.startsWith(".") && !item.startsWith("@/"));
    const base = {
      filePath: file.relativePath,
      imports,
      components,
      apis,
      pageLinks,
      databaseTables,
      storageBuckets,
      dependencies,
      usedBy: [] as string[],
      lastModified: file.modifiedAt,
    };

    if (/app\/.*\/page\.(tsx|ts|jsx|js)$/.test(file.relativePath) || file.relativePath === "app/page.tsx") {
      const route = routeFromPage(file.relativePath);
      items.push({
        ...base,
        id: `page:${route}`,
        name: `${nameFromRoute(route, "Page")} Page`,
        type: "page",
        route,
        purpose: "Application route rendered by the Next.js App Router.",
        description: `Route ${route} is backed by ${file.relativePath}.`,
      });
      continue;
    }

    if (/app\/.*\/layout\.(tsx|ts|jsx|js)$/.test(file.relativePath) || file.relativePath === "app/layout.tsx") {
      items.push({
        ...base,
        id: `layout:${file.relativePath}`,
        name: `${toTitle(path.basename(path.dirname(file.relativePath)) || "Root")} Layout`,
        type: "layout",
        purpose: "Shared layout wrapper for nested routes.",
        description: `Layout file ${file.relativePath} provides shared structure for route segments.`,
      });
      continue;
    }

    if (/app\/.*\/route\.(tsx|ts|jsx|js)$/.test(file.relativePath)) {
      const route = routeFromApi(file.relativePath);
      items.push({
        ...base,
        id: `api:${route}`,
        name: `${nameFromRoute(route, "API")} API`,
        type: "api",
        route,
        purpose: "Next.js route handler used for server-side API behavior.",
        description: `API route ${route} is implemented by ${file.relativePath}.`,
      });
      continue;
    }

    if (file.relativePath.endsWith(".tsx")) {
      const name = path.basename(file.relativePath, path.extname(file.relativePath));
      items.push({
        ...base,
        id: `component:${file.relativePath}`,
        name,
        type: "component",
        purpose: "Reusable UI or client interaction component.",
        description: `${name} is a component detected from ${file.relativePath}.`,
      });
    }

    if (isEmailRelated(file.content)) {
      items.push({
        ...base,
        id: `email:${file.relativePath}`,
        name: `${toTitle(path.basename(file.relativePath, path.extname(file.relativePath)))} Email Logic`,
        type: "email",
        purpose: "Email or notification-related logic detected by keyword scan.",
        description: `Email-related terms were detected in ${file.relativePath}.`,
      });
    }

    if (isAuditRelated(file.content)) {
      items.push({
        ...base,
        id: `audit:${file.relativePath}`,
        name: `${toTitle(path.basename(file.relativePath, path.extname(file.relativePath)))} Audit Logic`,
        type: "audit",
        purpose: "Audit log related logic detected by keyword scan.",
        description: `Audit-related logic was detected in ${file.relativePath}.`,
      });
    }
  }

  const allTables = [...new Set(items.flatMap((item) => item.databaseTables))];
  const allBuckets = [...new Set(items.flatMap((item) => item.storageBuckets))];

  allTables.forEach((table) => {
    items.push({
      id: `database:${table}`,
      name: `${toTitle(table)} Table`,
      type: table.includes("audit") ? "audit" : "database",
      purpose: "Supabase database table detected from query usage.",
      imports: [],
      components: [],
      apis: [],
      databaseTables: [],
      storageBuckets: [],
      pageLinks: [],
      dependencies: [],
      usedBy: items.filter((item) => item.databaseTables.includes(table)).map((item) => item.name),
      description: `Detected through supabase.from("${table}") usage.`,
    });
  });

  allBuckets.forEach((bucket) => {
    items.push({
      id: `storage:${bucket}`,
      name: `${toTitle(bucket)} Bucket`,
      type: "storage",
      purpose: "Supabase Storage bucket detected from storage usage.",
      imports: [],
      components: [],
      apis: [],
      databaseTables: [],
      storageBuckets: [],
      pageLinks: [],
      dependencies: [],
      usedBy: items.filter((item) => item.storageBuckets.includes(bucket)).map((item) => item.name),
      description: `Detected through supabase.storage.from("${bucket}") usage.`,
    });
  });

  const itemByImportPath = new Map<string, ArchitectureItem>();
  items.forEach((item) => {
    if (item.filePath) {
      itemByImportPath.set(`@/${item.filePath.replace(/\.(tsx|ts|jsx|js)$/, "")}`, item);
      itemByImportPath.set(item.filePath.replace(/\.(tsx|ts|jsx|js)$/, ""), item);
    }
  });

  items.forEach((item) => {
    item.imports.forEach((importPath) => {
      const imported = itemByImportPath.get(importPath);
      if (imported && !imported.usedBy.includes(item.name)) {
        imported.usedBy.push(item.name);
      }
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    metrics: {
      totalPages: items.filter((item) => item.type === "page").length,
      totalComponents: items.filter((item) => item.type === "component").length,
      totalApis: items.filter((item) => item.type === "api").length,
      totalDatabaseTables: allTables.length,
      totalStorageBuckets: allBuckets.length,
    },
  };
}
