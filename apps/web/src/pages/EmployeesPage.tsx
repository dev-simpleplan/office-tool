import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEmployeeSchema, type CreateEmployeeInput } from "@office/validation";
import { Button, Input, Table, Badge } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { EmployeeSummary } from "@office/shared";
import { useState } from "react";

export function EmployeesPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("employees.create");
  const canViewSalary = user?.permissions.includes("salary.view");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({ resolver: zodResolver(CreateEmployeeSchema) });

  const createMutation = useMutation({
    mutationFn: (input: CreateEmployeeInput) => api.post("/api/employees", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add Employee"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Full Name</label>
            <Input {...register("fullName")} />
            {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Job Title</label>
            <Input {...register("jobTitle")} />
            {errors.jobTitle && <p className="mt-1 text-xs text-danger">{errors.jobTitle.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Hire Date</label>
            <Input type="date" {...register("hireDate")} />
            {errors.hireDate && <p className="mt-1 text-xs text-danger">{errors.hireDate.message}</p>}
          </div>
          {canViewSalary && (
            <div>
              <label className="mb-1 block text-sm font-medium">Salary</label>
              <Input type="number" step="0.01" {...register("salary", { valueAsNumber: true })} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Employee"}
            </Button>
            {createMutation.isError && (
              <p className="mt-2 text-sm text-danger">Failed to create employee.</p>
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
              <th>Title</th>
              <th>Email</th>
              <th>Status</th>
              {canViewSalary && <th>Salary</th>}
            </tr>
          </thead>
          <tbody>
            {data?.employees.map((e) => (
              <tr key={e.id}>
                <td>{e.fullName}</td>
                <td>{e.jobTitle}</td>
                <td>{e.email}</td>
                <td>
                  <Badge variant={e.status === "ACTIVE" ? "success" : "warning"}>{e.status}</Badge>
                </td>
                {canViewSalary && <td>{e.salary != null ? `$${e.salary}` : "-"}</td>}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
