export type ProjectRow = {
  id: string;
  project_name: string;
  agent: string;
  channel: string;
  deadline: string;
  status: "Product" | "Finance" | "Contracting" | "Completed";
  description: string;
  progress: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = ProjectRow & {
  name: string;
  progress: string;
  deadline: string;
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
    progress: row.progress || getProgressForStatus(row.status),
  };
}
