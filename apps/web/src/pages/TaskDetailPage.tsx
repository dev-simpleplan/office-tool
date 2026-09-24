import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Badge, Button, Input, DatePicker } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { TaskDetail } from "@office/shared";
import { TASK_STATUSES } from "@office/validation";
import { useRef, useState } from "react";
import { relativeTime } from "../lib/relativeTime";

const ACTIVITY_LABEL: Record<string, string> = {
  created: "created the task",
  status_changed: "changed status",
  assigned: "assigned the task",
  reassigned: "reassigned the task",
  comment_added: "added a comment",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const attachmentUploadMutation = useMutation({
    mutationFn: (file: File) => api.postFile(`/api/tasks/${id}/attachments`, file),
    onSuccess: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          <div className="sm:col-span-3"><p className="text-xs text-text-muted">Description</p><p className="whitespace-pre-wrap">{task.description}</p></div>
        )}
        {task.links.length > 0 && (
          <div className="sm:col-span-3">
            <p className="mb-1 text-xs text-text-muted">Links</p>
            <ul className="space-y-1">
              {task.links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
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
        <ul className="mb-4 space-y-2">
          {task.timeEntries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {(entry.employee?.fullName ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-medium">{entry.employee?.fullName ?? "-"}</span>
                  <span className="text-text-muted">logged</span>
                  <Badge variant="default">{entry.hours}h</Badge>
                  <span className="text-text-muted">on {new Date(entry.date).toLocaleDateString()}</span>
                </div>
                {entry.description && <p className="mt-1 text-text-muted">{entry.description}</p>}
              </div>
            </li>
          ))}
          {task.timeEntries.length === 0 && <p className="text-sm text-text-muted">No time logged yet.</p>}
        </ul>
        {canLogTime && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border/70 p-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Date</label>
              <DatePicker value={timeEntryDate} onChange={setTimeEntryDate} />
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
              {timeEntryMutation.isPending ? "Logging..." : "Log Time"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Comments</h2>
        <ul className="mb-4 space-y-2">
          {task.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {(c.author?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{c.author?.email ?? "-"}</span>
                  <span className="text-xs text-text-muted">{relativeTime(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
              </div>
            </li>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-text-muted">No comments yet.</p>}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Add a comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <Button disabled={!commentText || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
            {commentMutation.isPending ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Attachments</h2>
        <ul className="mb-4 space-y-2">
          {task.attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  📎
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.fileName}</p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(a.fileSize)} · uploaded by {a.uploadedBy?.email ?? "-"} · {relativeTime(a.createdAt)}
                  </p>
                </div>
              </div>
              <button
                className="shrink-0 text-primary hover:underline disabled:opacity-50"
                disabled={downloadingId === a.id}
                onClick={async () => {
                  setDownloadingId(a.id);
                  try {
                    await api.downloadBlob(`/api/tasks/${id}/attachments/${a.id}`, a.fileName);
                  } finally {
                    setDownloadingId(null);
                  }
                }}
              >
                {downloadingId === a.id ? "Downloading..." : "Download"}
              </button>
            </li>
          ))}
          {task.attachments.length === 0 && <p className="text-sm text-text-muted">No attachments yet.</p>}
        </ul>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) attachmentUploadMutation.mutate(file);
            }}
            disabled={attachmentUploadMutation.isPending}
          />
          {attachmentUploadMutation.isPending && <span className="text-xs text-text-muted">Uploading...</span>}
        </div>
        {attachmentUploadMutation.isError && (
          <p className="mt-2 text-sm text-danger">Upload failed. File may be too large (max 10MB) or you may not have access.</p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        <ul className="space-y-2">
          {task.activities.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{a.actor?.email ?? "-"}</span>{" "}
                <span className="text-text-muted">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                {a.fromValue !== undefined && a.toValue !== undefined && a.action === "status_changed" && (
                  <span className="text-text-muted"> ({a.fromValue ?? "-"} to {a.toValue ?? "-"})</span>
                )}
              </div>
              <span className="shrink-0 text-xs text-text-muted">{relativeTime(a.createdAt)}</span>
            </li>
          ))}
          {task.activities.length === 0 && <p className="text-sm text-text-muted">No activity yet.</p>}
        </ul>
      </div>
    </div>
  );
}
