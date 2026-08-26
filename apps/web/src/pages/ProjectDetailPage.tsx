import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Badge, Table } from "@office/ui";
import { api } from "../lib/api";
import type { ProjectDetail } from "@office/shared";

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

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-3">
        <div><p className="text-xs text-text-muted">Client</p><p>{project.client ?? "-"}</p></div>
        <div><p className="text-xs text-text-muted">Department</p><p>{project.department?.name ?? "-"}</p></div>
        <div><p className="text-xs text-text-muted">Team</p><p>{project.team?.name ?? "-"}</p></div>
        <div><p className="text-xs text-text-muted">Project Lead</p><p>{project.projectLead?.fullName ?? "-"}</p></div>
        <div><p className="text-xs text-text-muted">Priority</p><p>{project.priority}</p></div>
        <div><p className="text-xs text-text-muted">Budget</p><p>{project.budget != null ? `$${project.budget.toLocaleString()}` : "-"}</p></div>
        <div><p className="text-xs text-text-muted">Start Date</p><p>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}</p></div>
        <div><p className="text-xs text-text-muted">End Date</p><p>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}</p></div>
        <div><p className="text-xs text-text-muted">Progress</p><p>{progress}% ({project.completedTaskCount}/{project.taskCount} tasks)</p></div>
        {project.description && (
          <div className="sm:col-span-3"><p className="text-xs text-text-muted">Description</p><p>{project.description}</p></div>
        )}
      </div>

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
