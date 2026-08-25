import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateDepartmentSchema, type CreateDepartmentInput } from "@office/validation";
import { Button, Input, Table, Badge, ConfirmDialog } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { DepartmentSummary } from "@office/shared";
import { useState } from "react";

export function DepartmentsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("departments.create");
  const canUpdate = user?.permissions.includes("departments.update");
  const canArchive = user?.permissions.includes("departments.archive");
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DepartmentSummary | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: DepartmentSummary[] }>("/api/departments"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDepartmentInput>({ resolver: zodResolver(CreateDepartmentSchema) });

  function closeForm() {
    reset({ name: "", description: "" });
    setShowForm(false);
    setEditingDept(null);
  }

  function openCreateForm() {
    reset({ name: "", description: "" });
    setEditingDept(null);
    setShowForm(true);
  }

  function openEditForm(dept: DepartmentSummary) {
    reset({ name: dept.name, description: dept.description ?? "" });
    setEditingDept(dept);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateDepartmentInput) => api.post("/api/departments", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateDepartmentInput) => api.patch(`/api/departments/${editingDept!.id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      closeForm();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/departments/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setArchiveTarget(null);
    },
  });

  const activeMutation = editingDept ? updateMutation : createMutation;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        {canCreate && (
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
            {showForm ? "Cancel" : "Add Department"}
          </Button>
        )}
      </div>

      {showForm && (canCreate || canUpdate) && (
        <form
          onSubmit={handleSubmit((formData) => activeMutation.mutate(formData))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          {editingDept && (
            <p className="sm:col-span-2 text-sm text-text-muted">Editing "{editingDept.name}"</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input {...register("description")} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || activeMutation.isPending}>
              {activeMutation.isPending ? "Saving..." : editingDept ? "Update Department" : "Save Department"}
            </Button>
            {editingDept && (
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel Edit
              </Button>
            )}
            {activeMutation.isError && <p className="text-sm text-danger">Failed to save department.</p>}
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
              <th>Description</th>
              <th>Status</th>
              {(canUpdate || canArchive) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.departments.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.description ?? "-"}</td>
                <td>
                  <Badge variant={d.status === "ACTIVE" ? "success" : "warning"}>{d.status}</Badge>
                </td>
                {(canUpdate || canArchive) && (
                  <td>
                    {d.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        {canUpdate && (
                          <Button variant="ghost" onClick={() => openEditForm(d)}>
                            Edit
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" onClick={() => setArchiveTarget(d)}>
                            Archive
                          </Button>
                        )}
                      </div>
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
        title="Archive Department"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? It will no longer be assignable to employees or teams.`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
