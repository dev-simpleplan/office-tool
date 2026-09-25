import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Badge, DetailGrid, DetailItem, ProgressBar, Table } from "@office/ui";
import { api } from "../lib/api";
import { formatINR } from "../lib/currency";
import type { ProjectDetail } from "@office/shared";

const PRIORITY_VARIANT: Record<string, "default" | "info" | "warning" | "danger"> = {
  LOW: "default",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.get<{ project: ProjectDetail }>(`/api/projects/${id}`),
  });

  if (isLoading) return <p className="text-text-muted">Loading...</p>;
  const project = data?.project;
  if (!project) return <p className="text-text-muted">Project not found.</p>;

  const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;

  return (
    <div>
      <button onClick={() => navigate("/projects")} className="mb-4 text-sm text-text-muted hover:text-text">
        &larr; Back to Projects
      </button>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Badge variant={project.status === "ARCHIVED" ? "warning" : "success"}>{project.status}</Badge>
      </div>

      <DetailGrid className="mb-8">
        <DetailItem label="Client">{project.client}</DetailItem>
        <DetailItem label="Department">{project.department?.name}</DetailItem>
        <DetailItem label="Team">{project.team?.name}</DetailItem>
        <DetailItem label="Project Lead">{project.projectLead?.fullName}</DetailItem>
        <DetailItem label="Priority">
          <Badge variant={PRIORITY_VARIANT[project.priority] ?? "default"}>{project.priority}</Badge>
        </DetailItem>
        <DetailItem label="Budget">{project.budget != null ? formatINR(project.budget) : null}</DetailItem>
        <DetailItem label="Start Date">
          {project.startDate ? new Date(project.startDate).toLocaleDateString() : null}
        </DetailItem>
        <DetailItem label="End Date">
          {project.endDate ? new Date(project.endDate).toLocaleDateString() : null}
        </DetailItem>
        <DetailItem label="Progress">
          <ProgressBar value={progress} />
          <span className="text-sm text-text-secondary">
            {progress}% · {project.completedTaskCount} of {project.taskCount} tasks done
          </span>
        </DetailItem>
        {project.description && (
          <DetailItem label="Description" full>
            {project.description}
          </DetailItem>
        )}
      </DetailGrid>

      <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
      <Table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {project.tasks.map((t) => (
            <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="cursor-pointer hover:bg-surface-hover">
              <td>{t.title}</td>
              <td>{t.assignee?.fullName ?? "Unassigned"}</td>
              <td><Badge variant={t.status === "COMPLETED" ? "success" : t.status === "BLOCKED" ? "danger" : "default"}>{t.status}</Badge></td>
              <td>{t.priority}</td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
            </tr>
          ))}
          {project.tasks.length === 0 && (
            <tr><td colSpan={5} className="text-text-muted">No tasks yet.</td></tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
