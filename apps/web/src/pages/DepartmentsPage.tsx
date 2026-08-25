import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateDepartmentSchema, type CreateDepartmentInput } from "@office/validation";
import { Button, Input, Table, Badge } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { DepartmentSummary } from "@office/shared";
import { useState } from "react";

export function DepartmentsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("departments.create");
  const canArchive = user?.permissions.includes("departments.archive");
  const [showForm, setShowForm] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: (input: CreateDepartmentInput) => api.post("/api/departments", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      reset();
      setShowForm(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/departments/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add Department"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input {...register("description")} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Department"}
            </Button>
            {createMutation.isError && (
              <p className="mt-2 text-sm text-danger">Failed to create department.</p>
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
              <th>Description</th>
              <th>Status</th>
              {canArchive && <th>Actions</th>}
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
                {canArchive && (
                  <td>
                    {d.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        onClick={() => archiveMutation.mutate(d.id)}
                        disabled={archiveMutation.isPending}
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
    </div>
  );
}
