import type { Database } from "@/lib/database.types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectFileRow = Database["public"]["Tables"]["project_files"]["Row"];
export type ProjectFileInsert = Database["public"]["Tables"]["project_files"]["Insert"];
export type ProjectFileUpdate = Database["public"]["Tables"]["project_files"]["Update"];
export type ProjectFileAuditEventRow = Database["public"]["Tables"]["project_file_audit_events"]["Row"];
export type ProjectFileAuditEventInsert = Database["public"]["Tables"]["project_file_audit_events"]["Insert"];
export type ProjectChatMessageRow = Database["public"]["Tables"]["project_chat_messages"]["Row"];
export type ProjectChatMessageInsert = Database["public"]["Tables"]["project_chat_messages"]["Insert"];

export type Project = Omit<ProjectRow, "progress" | "deadline" | "description"> & {
  name: string;
  progress: string;
  deadline: string;
  deadline_raw: string;
  description: string;
};

const progressMap: Record<ProjectRow["status"], string> = {
  Product: "25%",
  Finance: "55%",
  Contracting: "75%",
  Completed: "100%",
};

export function getProgressForStatus(status: ProjectRow["status"]): string {
  return progressMap[status] ?? "0%";
}

function formatProgress(progress: ProjectRow["progress"], status: ProjectRow["status"]) {
  return Number.isFinite(progress) ? `${progress}%` : getProgressForStatus(status);
}

export function mapProjectRow(row: ProjectRow): Project {
  const deadlineDate = row.deadline ? new Date(row.deadline) : null;
  const deadline = deadlineDate
    ? deadlineDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : row.deadline || "";

  return {
    ...row,
    name: row.project_name,
    deadline,
    deadline_raw: row.deadline,
    description: row.description ?? "",
    progress: formatProgress(row.progress, row.status),
  };
}
