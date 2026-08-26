import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateProjectSchema, PROJECT_STATUSES, PRIORITIES, type CreateProjectInput } from "@office/validation";
import { Button, Input, Table, Badge, ConfirmDialog } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { ProjectSummary, DepartmentSummary, TeamSummary, EmployeeSummary } from "@office/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("projects.create");
  const canUpdate = user?.permissions.includes("projects.update");
  const canArchive = user?.permissions.includes("projects.archive");
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProjectSummary | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ projects: ProjectSummary[] }>("/api/projects"),
  });
  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: DepartmentSummary[] }>("/api/departments"),
    enabled: canCreate || canUpdate,
  });
  const { data: teamData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<{ teams: TeamSummary[] }>("/api/teams"),
    enabled: canCreate || canUpdate,
  });
  const { data: empData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
    enabled: canCreate || canUpdate,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({ resolver: zodResolver(CreateProjectSchema) });

  function closeForm() {
    reset({ name: "", client: "", description: "", departmentId: "", teamId: "", projectLeadId: "" });
    setShowForm(false);
    setEditingProject(null);
  }

  function openCreateForm() {
    reset({ name: "", client: "", description: "", departmentId: "", teamId: "", projectLeadId: "" });
    setEditingProject(null);
    setShowForm(true);
  }

  function openEditForm(p: ProjectSummary) {
    reset({
      name: p.name,
      client: p.client ?? "",
      description: p.description ?? "",
      departmentId: p.departmentId ?? "",
      teamId: p.teamId ?? "",
      projectLeadId: p.projectLeadId ?? "",
      status: p.status,
      priority: p.priority,
      budget: p.budget ?? undefined,
      estimatedHours: p.estimatedHours ?? undefined,
    });
    setEditingProject(p);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => api.post("/api/projects", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeForm();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => api.patch(`/api/projects/${editingProject!.id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeForm();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/projects/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setArchiveTarget(null);
    },
  });

  const activeMutation = editingProject ? updateMutation : createMutation;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        {canCreate && (
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
            {showForm ? "Cancel" : "Add Project"}
          </Button>
        )}
      </div>

      {showForm && (canCreate || canUpdate) && (
        <form
          onSubmit={handleSubmit((data) => activeMutation.mutate(data))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          {editingProject && (
            <p className="sm:col-span-2 text-sm text-text-muted">Editing "{editingProject.name}"</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Client</label>
            <Input {...register("client")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select className="op-input" {...register("departmentId")}>
              <option value="">None</option>
              {deptData?.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Team</label>
            <select className="op-input" {...register("teamId")}>
              <option value="">None</option>
              {teamData?.teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Project Lead</label>
            <select className="op-input" {...register("projectLeadId")}>
              <option value="">None</option>
              {empData?.employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select className="op-input" {...register("status")}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select className="op-input" {...register("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Budget</label>
            <Input type="number" step="0.01" {...register("budget")} />
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
            <Button type="submit" disabled={isSubmitting || activeMutation.isPending}>
              {activeMutation.isPending ? "Saving..." : editingProject ? "Update Project" : "Save Project"}
            </Button>
            {editingProject && (
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel Edit
              </Button>
            )}
            {activeMutation.isError && <p className="text-sm text-danger">Failed to save project.</p>}
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Department</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Progress</th>
              {(canUpdate || canArchive) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.projects.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="cursor-pointer hover:bg-surface-hover"
              >
                <td>{p.name}</td>
                <td>{p.client ?? "-"}</td>
                <td>{p.department?.name ?? "-"}</td>
                <td><Badge variant={p.status === "ARCHIVED" ? "warning" : "success"}>{p.status}</Badge></td>
                <td>{p.priority}</td>
                <td>{p.taskCount ? `${p.completedTaskCount}/${p.taskCount}` : "-"}</td>
                {(canUpdate || canArchive) && (
                  <td className="flex gap-2">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(p);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {canArchive && p.status !== "ARCHIVED" && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveTarget(p);
                        }}
                      >
                        Archive
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive Project"
        description={`Are you sure you want to archive "${archiveTarget?.name}"?`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
