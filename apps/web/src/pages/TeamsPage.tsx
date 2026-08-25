import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTeamSchema, type CreateTeamInput } from "@office/validation";
import { Button, Input, Table } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { DepartmentSummary, TeamSummary, EmployeeSummary } from "@office/shared";
import { useState } from "react";

export function TeamsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("teams.create");
  const canUpdate = user?.permissions.includes("teams.update");
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null);
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
            <select className="op-input h-32" multiple {...register("memberIds")}>
              {empData?.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
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
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
