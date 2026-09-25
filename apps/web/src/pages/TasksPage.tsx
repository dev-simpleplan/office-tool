import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTaskSchema, TASK_STATUSES, TASK_PRIORITIES, type CreateTaskInput } from "@office/validation";
import { Button, ConfirmDialog, Input, Textarea, Table, Badge, DatePicker, DateRangePicker, type DateRange, type DateRangePreset } from "@office/ui";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { TaskSummary, ProjectSummary, EmployeeSummary } from "@office/shared";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type DuePreset = DateRangePreset | "all";

const PRIORITY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };

type SortKey = "title" | "project" | "assignee" | "status" | "priority" | "due" | "hours";

const SORT_ACCESSORS: Record<SortKey, (t: TaskSummary) => string | number> = {
  title: (t) => t.title.toLowerCase(),
  project: (t) => t.project?.name?.toLowerCase() ?? "",
  assignee: (t) => t.assignee?.fullName?.toLowerCase() ?? "",
  status: (t) => t.status,
  priority: (t) => PRIORITY_RANK[t.priority] ?? 0,
  due: (t) => (t.dueDate ? new Date(t.dueDate).getTime() : -Infinity),
  hours: (t) => t.actualHours,
};

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort?.key === sortKey;
  const Icon = isActive ? (activeSort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${isActive ? "text-text" : "text-text-muted"}`}
      >
        {label}
        <Icon size={13} />
      </button>
    </th>
  );
}

export function TasksPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("tasks.create");
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ projectId: "", status: "", priority: "", assigneeId: "" });
  const [duePreset, setDuePreset] = useState<DuePreset>("all");
  const [dueRange, setDueRange] = useState<DateRange>({ start: "", end: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canDelete = useAuthStore((s) => s.user?.permissions.includes("tasks.delete"));
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteTarget(null);
    },
  });

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const allFilters = {
    ...filters,
    dueStart: duePreset === "all" ? "" : dueRange.start,
    dueEnd: duePreset === "all" ? "" : dueRange.end,
  };
  const params = new URLSearchParams(Object.entries(allFilters).filter(([, v]) => v));
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", allFilters],
    queryFn: () => api.get<{ tasks: TaskSummary[] }>(`/api/tasks?${params.toString()}`),
  });
  const { data: projectData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ projects: ProjectSummary[] }>("/api/projects"),
  });
  const { data: empData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
  });

  const sortedTasks = useMemo(() => {
    const tasks = data?.tasks ?? [];
    if (!sort) return tasks;
    const accessor = SORT_ACCESSORS[sort.key];
    const sorted = [...tasks].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sort.dir === "desc" ? sorted.reverse() : sorted;
  }, [data, sort]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({ resolver: zodResolver(CreateTaskSchema) });
  const [links, setLinks] = useState<string[]>([""]);
  const [tagsInput, setTagsInput] = useState("");

  function closeForm() {
    reset({ title: "", description: "", projectId: "", assigneeId: "" });
    setLinks([""]);
    setTagsInput("");
    setShowForm(false);
  }

  function submitTask(formData: CreateTaskInput) {
    createMutation.mutate({
      ...formData,
      links: links.map((l) => l.trim()).filter(Boolean),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => api.post("/api/tasks", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeForm();
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {canCreate && (
          <Button onClick={() => (showForm ? closeForm() : setShowForm(true))}>
            {showForm ? "Cancel" : "Add Task"}
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="op-input w-auto"
          value={filters.projectId}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
        >
          <option value="">All Projects</option>
          {projectData?.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="op-input w-auto"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="op-input w-auto"
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="op-input w-auto"
          value={filters.assigneeId}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
        >
          <option value="">All Assignees</option>
          {empData?.employees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullName}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Due Date</label>
        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            className={`op-date-range-picker__preset ${duePreset === "all" ? "op-date-range-picker__preset--active" : ""}`}
            onClick={() => {
              setDuePreset("all");
              setDueRange({ start: "", end: "" });
            }}
          >
            All Time
          </button>
          <DateRangePicker
            value={dueRange}
            preset={duePreset === "all" ? ("all" as unknown as DateRangePreset) : duePreset}
            onChange={(range, preset) => {
              setDueRange(range);
              setDuePreset(preset);
            }}
          />
        </div>
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleSubmit(submitTask)}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input {...register("title")} />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Project</label>
            <select className="op-input" {...register("projectId")}>
              <option value="">None (standalone)</option>
              {projectData?.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Assignee</label>
            <select className="op-input" {...register("assigneeId")}>
              <option value="">Unassigned</option>
              {empData?.employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select className="op-input" {...register("priority")}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select className="op-input" {...register("status")}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Start Date</label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Due Date</label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estimated Hours</label>
            <Input type="number" step="0.5" {...register("estimatedHours")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tags</label>
            <Input
              placeholder="comma, separated, tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea rows={5} {...register("description")} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Links</label>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) =>
                      setLinks((ls) => ls.map((l, idx) => (idx === i ? e.target.value : l)))
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setLinks((ls) => ls.filter((_, idx) => idx !== i))}
                    disabled={links.length === 1}
                    aria-label="Remove link"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setLinks((ls) => [...ls, ""])}>
                <Plus size={16} /> Add Link
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Task"}
            </Button>
            {createMutation.isError && <p className="text-sm text-danger">Failed to save task.</p>}
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <SortableHeader label="Title" sortKey="title" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Project" sortKey="project" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Assignee" sortKey="assignee" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Status" sortKey="status" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Priority" sortKey="priority" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Due" sortKey="due" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Hours (act/est)" sortKey="hours" activeSort={sort} onSort={toggleSort} />
              {canDelete && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((t) => (
              <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="cursor-pointer hover:bg-surface-hover">
                <td>{t.title}</td>
                <td>{t.project?.name ?? "-"}</td>
                <td>{t.assignee?.fullName ?? "Unassigned"}</td>
                <td><Badge variant={t.status === "COMPLETED" ? "success" : t.status === "BLOCKED" ? "danger" : "default"}>{t.status}</Badge></td>
                <td>{t.priority}</td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
                <td>{t.actualHours}/{t.estimatedHours ?? "-"}</td>
                {canDelete && (
                  <td>
                    <Button
                      variant="ghost"
                      className="text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(t);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {sortedTasks.length === 0 && (
              <tr><td colSpan={canDelete ? 8 : 7} className="text-text-muted">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Task"
        warning="This permanently deletes the task and cannot be undone."
        description={`Delete "${deleteTarget?.title}"? Its comments, checklist, time entries, attachments, and activity history are deleted with it.`}
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
