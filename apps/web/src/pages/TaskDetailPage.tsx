import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Badge, Button, Input } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { TaskDetail } from "@office/shared";
import { TASK_STATUSES } from "@office/validation";
import { useState } from "react";

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.get<{ task: TaskDetail }>(`/api/tasks/${id}`),
  });

  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [timeEntryHours, setTimeEntryHours] = useState("");
  const [timeEntryDate, setTimeEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeEntryDesc, setTimeEntryDesc] = useState("");
  const [commentText, setCommentText] = useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/tasks/${id}`, { status }),
    onSuccess: invalidate,
  });
  const checklistAddMutation = useMutation({
    mutationFn: (label: string) => api.post(`/api/tasks/${id}/checklist`, { label }),
    onSuccess: () => {
      setNewChecklistLabel("");
      invalidate();
    },
  });
  const checklistToggleMutation = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      api.patch(`/api/tasks/${id}/checklist/${itemId}`, { isDone }),
    onSuccess: invalidate,
  });
  const timeEntryMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/tasks/${id}/time-entries`, {
        date: timeEntryDate,
        hours: Number(timeEntryHours),
        description: timeEntryDesc || undefined,
      }),
    onSuccess: () => {
      setTimeEntryHours("");
      setTimeEntryDesc("");
      invalidate();
    },
  });
  const commentMutation = useMutation({
    mutationFn: () => api.post(`/api/tasks/${id}/comments`, { content: commentText }),
    onSuccess: () => {
      setCommentText("");
      invalidate();
    },
  });

  if (isLoading) return <p className="text-text-muted">Loading...</p>;
  const task = data?.task;
  if (!task) return <p className="text-text-muted">Task not found.</p>;

  const isOwnTask = user?.employeeId && user.employeeId === task.assigneeId;
  const canChangeStatus = user?.permissions.includes("tasks.update") && (user.permissions.includes("tasks.assign") || isOwnTask);
  const canLogTime = user?.permissions.includes("time_entries.create");

  return (
    <div>
      <button onClick={() => navigate("/tasks")} className="mb-4 text-sm text-text-muted hover:text-text">
        &larr; Back to Tasks
      </button>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "BLOCKED" ? "danger" : "default"}>
          {task.status}
        </Badge>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-3">
        <div><p className="text-xs text-text-muted">Project</p><p>{task.project?.name ?? "Standalone"}</p></div>
        <div><p className="text-xs text-text-muted">Assignee</p><p>{task.assignee?.fullName ?? "Unassigned"}</p></div>
        <div><p className="text-xs text-text-muted">Priority</p><p>{task.priority}</p></div>
        <div><p className="text-xs text-text-muted">Due Date</p><p>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</p></div>
        <div><p className="text-xs text-text-muted">Estimated Hours</p><p>{task.estimatedHours ?? "-"}</p></div>
        <div><p className="text-xs text-text-muted">Actual Hours</p><p>{task.actualHours}</p></div>
        {task.description && (
          <div className="sm:col-span-3"><p className="text-xs text-text-muted">Description</p><p>{task.description}</p></div>
        )}
        {canChangeStatus && (
          <div className="sm:col-span-3">
            <label className="mb-1 block text-sm font-medium">Update Status</label>
            <select
              className="op-input w-auto"
              value={task.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              disabled={statusMutation.isPending}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Checklist</h2>
        <ul className="mb-3 space-y-2">
          {task.checklistItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isDone}
                onChange={(e) => checklistToggleMutation.mutate({ itemId: item.id, isDone: e.target.checked })}
              />
              <span className={item.isDone ? "text-text-muted line-through" : ""}>{item.label}</span>
            </li>
          ))}
          {task.checklistItems.length === 0 && <p className="text-sm text-text-muted">No checklist items.</p>}
        </ul>
        <div className="flex gap-2">
          <Input
            placeholder="New checklist item"
            value={newChecklistLabel}
            onChange={(e) => setNewChecklistLabel(e.target.value)}
          />
          <Button
            disabled={!newChecklistLabel || checklistAddMutation.isPending}
            onClick={() => checklistAddMutation.mutate(newChecklistLabel)}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Work Logs (Time Entries)</h2>
        <ul className="mb-3 space-y-2">
          {task.timeEntries.map((entry) => (
            <li key={entry.id} className="text-sm">
              <span className="font-medium">{entry.employee?.fullName ?? "-"}</span> logged {entry.hours}h on{" "}
              {new Date(entry.date).toLocaleDateString()}
              {entry.description && <span className="text-text-muted"> — {entry.description}</span>}
            </li>
          ))}
          {task.timeEntries.length === 0 && <p className="text-sm text-text-muted">No time logged yet.</p>}
        </ul>
        {canLogTime && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Date</label>
              <Input type="date" value={timeEntryDate} onChange={(e) => setTimeEntryDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Hours</label>
              <Input type="number" step="0.25" value={timeEntryHours} onChange={(e) => setTimeEntryHours(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Description</label>
              <Input value={timeEntryDesc} onChange={(e) => setTimeEntryDesc(e.target.value)} />
            </div>
            <Button disabled={!timeEntryHours || timeEntryMutation.isPending} onClick={() => timeEntryMutation.mutate()}>
              Log Time
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Comments</h2>
        <ul className="mb-3 space-y-3">
          {task.comments.map((c) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium">{c.author?.email ?? "-"}</span>{" "}
              <span className="text-text-muted">{new Date(c.createdAt).toLocaleString()}</span>
              <p>{c.content}</p>
            </li>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-text-muted">No comments yet.</p>}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Add a comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <Button disabled={!commentText || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
