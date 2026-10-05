import type { ProjectStatus } from "@office/shared";

export function projectStatusVariant(status: ProjectStatus): "success" | "warning" | "info" {
  if (status === "ARCHIVED") return "warning";
  if (status === "MAINTENANCE") return "info";
  return "success";
}

export function projectStatusLabel(status: ProjectStatus): string {
  return status.replace(/_/g, " ");
}
