import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTaskSchema, TASK_STATUSES, TASK_PRIORITIES, type CreateTaskInput } from "@office/validation";
import { Button, Input, Table, Badge, DatePicker } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { TaskSummary, ProjectSummary, EmployeeSummary } from "@office/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function TasksPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("tasks.create");
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ projectId: "", status: "", priority: "", assigneeId: "" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filters],
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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({ resolver: zodResolver(CreateTaskSchema) });

  function closeForm() {
    reset({ title: "", description: "", projectId: "", assigneeId: "" });
    setShowForm(false);
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

      {showForm && canCreate && (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          <div>
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input {...register("description")} />
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
              <th>Title</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Hours (act/est)</th>
            </tr>
          </thead>
          <tbody>
            {data?.tasks.map((t) => (
              <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="cursor-pointer hover:bg-surface-hover">
                <td>{t.title}</td>
                <td>{t.project?.name ?? "-"}</td>
                <td>{t.assignee?.fullName ?? "Unassigned"}</td>
                <td><Badge variant={t.status === "COMPLETED" ? "success" : t.status === "BLOCKED" ? "danger" : "default"}>{t.status}</Badge></td>
                <td>{t.priority}</td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
                <td>{t.actualHours}/{t.estimatedHours ?? "-"}</td>
              </tr>
            ))}
            {data?.tasks.length === 0 && (
              <tr><td colSpan={7} className="text-text-muted">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
