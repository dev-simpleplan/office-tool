import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTeamSchema, type CreateTeamInput } from "@office/validation";
import { Button, Input, Table, MultiSelect, Badge, ConfirmDialog } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { DepartmentSummary, TeamSummary, EmployeeSummary } from "@office/shared";
import { useState } from "react";

export function TeamsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("teams.create");
  const canUpdate = user?.permissions.includes("teams.update");
  const canArchive = user?.permissions.includes("teams.archive");
  const canDelete = user?.permissions.includes("teams.delete");
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TeamSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamSummary | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<{ teams: TeamSummary[] }>("/api/teams"),
  });
  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: DepartmentSummary[] }>("/api/departments"),
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamInput>({ resolver: zodResolver(CreateTeamSchema) });

  function closeForm() {
    reset({ name: "", departmentId: "", teamLeadId: "", description: "", memberIds: [] });
    setShowForm(false);
    setEditingTeam(null);
  }

  function openCreateForm() {
    reset({ name: "", departmentId: "", teamLeadId: "", description: "", memberIds: [] });
    setEditingTeam(null);
    setShowForm(true);
  }

  function openEditForm(team: TeamSummary) {
    reset({
      name: team.name,
      departmentId: team.departmentId,
      teamLeadId: team.teamLeadId ?? "",
      description: team.description ?? "",
      memberIds: team.members.map((m) => m.id),
    });
    setEditingTeam(team);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateTeamInput) => api.post("/api/teams", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateTeamInput) => api.patch(`/api/teams/${editingTeam!.id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      closeForm();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/teams/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setArchiveTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    },
  });

  const activeMutation = editingTeam ? updateMutation : createMutation;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        {canCreate && (
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
            {showForm ? "Cancel" : "Add Team"}
          </Button>
        )}
      </div>

      {showForm && (canCreate || canUpdate) && (
        <form
          onSubmit={handleSubmit((data) => activeMutation.mutate(data))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          {editingTeam && (
            <p className="sm:col-span-2 text-sm text-text-muted">Editing "{editingTeam.name}"</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select className="op-input" {...register("departmentId")}>
              <option value="">Select department</option>
              {deptData?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <p className="mt-1 text-xs text-danger">{errors.departmentId.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Team Lead</label>
            <select className="op-input" {...register("teamLeadId")}>
              <option value="">None</option>
              {empData?.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input {...register("description")} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Members</label>
            <Controller
              name="memberIds"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  options={(empData?.employees ?? []).map((e) => ({ id: e.id, label: e.fullName }))}
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  searchPlaceholder="Search employees..."
                />
              )}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || activeMutation.isPending}>
              {activeMutation.isPending ? "Saving..." : editingTeam ? "Update Team" : "Save Team"}
            </Button>
            {editingTeam && (
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel Edit
              </Button>
            )}
            {activeMutation.isError && (
              <p className="text-sm text-danger">Failed to save team.</p>
            )}
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
              <th>Department</th>
              <th>Team Lead</th>
              <th>Members</th>
              <th>Status</th>
              {(canArchive || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.teams.map((t) => (
              <tr
                key={t.id}
                onClick={() => canUpdate && openEditForm(t)}
                className={canUpdate ? "cursor-pointer hover:bg-surface-hover" : undefined}
              >
                <td>{t.name}</td>
                <td>{t.department?.name ?? "-"}</td>
                <td>{t.teamLead?.fullName ?? "-"}</td>
                <td>{t.members.length}</td>
                <td>
                  <Badge variant={t.status === "ACTIVE" ? "success" : "warning"}>{t.status}</Badge>
                </td>
                {(canArchive || canDelete) && (
                  <td>
                    <div className="flex gap-2">
                      {canArchive && t.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveTarget(t);
                          }}
                        >
                          Archive
                        </Button>
                      )}
                      {canDelete && (
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
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive Team"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? Its members will need to be reassigned.`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Team"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone. Its members, projects, and tasks are left without a team.`}
        warning="This permanently deletes the team and cannot be undone. To just hide it, use Archive instead."
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
