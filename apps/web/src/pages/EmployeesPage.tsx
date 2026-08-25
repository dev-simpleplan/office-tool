import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEmployeeSchema, type CreateEmployeeInput } from "@office/validation";
import { Button, Input, Table, Badge } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { EmployeeSummary, DepartmentSummary, TeamSummary, WorkScheduleSummary } from "@office/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function EmployeesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("employees.create");
  const canViewSalary = user?.permissions.includes("salary.view");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
  });
  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: DepartmentSummary[] }>("/api/departments"),
    enabled: !!canCreate,
  });
  const { data: teamData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<{ teams: TeamSummary[] }>("/api/teams"),
    enabled: !!canCreate,
  });
  const { data: scheduleData } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get<{ schedules: WorkScheduleSummary[] }>("/api/schedules"),
    enabled: !!canCreate,
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
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select className="op-input" {...register("departmentId")}>
              <option value="">None</option>
              {deptData?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Team</label>
            <select className="op-input" {...register("teamId")}>
              <option value="">None</option>
              {teamData?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Work Schedule</label>
            <select className="op-input" {...register("scheduleId")}>
              <option value="">None</option>
              {scheduleData?.schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
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
              <th>Department</th>
              <th>Team</th>
              <th>Status</th>
              {canViewSalary && <th>Salary</th>}
            </tr>
          </thead>
          <tbody>
            {data?.employees.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/employees/${e.id}`)}
                className="cursor-pointer hover:bg-surface-hover"
              >
                <td>{e.fullName}</td>
                <td>{e.jobTitle}</td>
                <td>{e.email}</td>
                <td>{e.department?.name ?? "-"}</td>
                <td>{e.team?.name ?? "-"}</td>
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
