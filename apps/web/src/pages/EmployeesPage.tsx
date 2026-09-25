import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEmployeeSchema, ASSIGNABLE_ROLES, type CreateEmployeeInput } from "@office/validation";
import { Button, Input, Table, Badge, DatePicker } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { EmployeeSummary, DepartmentSummary, TeamSummary, WorkScheduleSummary } from "@office/shared";
import { useState } from "react";
import { formatINR } from "../lib/currency";
import { useNavigate } from "react-router-dom";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", TEAM_LEAD: "Team Lead", EMPLOYEE: "Employee" };

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
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({ resolver: zodResolver(CreateEmployeeSchema) });
  const createLogin = watch("createLogin");
  const canAssignRoles = useAuthStore((s) => s.user?.permissions.includes("roles.assign"));
  const chosenRole = watch("role");

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
            <label htmlFor="employee-fullName" className="mb-1 block text-sm font-medium">Full Name</label>
            <Input id="employee-fullName" {...register("fullName")} />
            {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>}
          </div>
          <div>
            <label htmlFor="employee-jobTitle" className="mb-1 block text-sm font-medium">Job Title</label>
            <Input id="employee-jobTitle" {...register("jobTitle")} />
            {errors.jobTitle && <p className="mt-1 text-xs text-danger">{errors.jobTitle.message}</p>}
          </div>
          <div>
            <label htmlFor="employee-email" className="mb-1 block text-sm font-medium">Email</label>
            <Input id="employee-email" type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="employee-hireDate" className="mb-1 block text-sm font-medium">Hire Date</label>
            <Controller
              name="hireDate"
              control={control}
              render={({ field }) => <DatePicker id="employee-hireDate" value={field.value ?? ""} onChange={field.onChange} />}
            />
            {errors.hireDate && <p className="mt-1 text-xs text-danger">{errors.hireDate.message}</p>}
          </div>
          <div>
            <label htmlFor="employee-dob" className="mb-1 block text-sm font-medium">Date of Birth</label>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => <DatePicker id="employee-dob" value={field.value ?? ""} onChange={field.onChange} />}
            />
          </div>
          {canViewSalary && (
            <div>
              <label htmlFor="employee-salary" className="mb-1 block text-sm font-medium">Salary (₹)</label>
              <Input id="employee-salary" type="number" step="0.01" {...register("salary", { valueAsNumber: true })} />
            </div>
          )}
          <div>
            <label htmlFor="employee-department" className="mb-1 block text-sm font-medium">Department</label>
            <select id="employee-department" className="op-input" {...register("departmentId")}>
              <option value="">None</option>
              {deptData?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employee-team" className="mb-1 block text-sm font-medium">Team</label>
            <select id="employee-team" className="op-input" {...register("teamId")}>
              <option value="">None</option>
              {teamData?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employee-schedule" className="mb-1 block text-sm font-medium">Work Schedule</label>
            <select id="employee-schedule" className="op-input" {...register("scheduleId")}>
              <option value="">None</option>
              {scheduleData?.schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 rounded-md border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" {...register("createLogin")} />
              Create a login account for this employee
            </label>
            {createLogin && (
              <div className="mt-3 max-w-sm">
                <label htmlFor="employee-password" className="mb-1 block text-sm font-medium">
                  Temporary Password
                </label>
                <Input id="employee-password" type="text" {...register("password")} />
                <p className="mt-1 text-xs text-text-muted">
                  Share this with {"the employee's"} email above — they can sign in with it
                  immediately (there is no separate invite email yet).
                </p>
                {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                {canAssignRoles && (
                  <div className="mt-3">
                    <label htmlFor="employee-role" className="mb-1 block text-sm font-medium">
                      Role
                    </label>
                    <select id="employee-role" className="op-input" defaultValue="EMPLOYEE" {...register("role")}>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    {chosenRole === "ADMIN" && (
                      <p className="mt-1 text-xs text-danger">
                        Admins can see salaries, manage every record, and permanently delete data.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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
                {canViewSalary && <td>{e.salary != null ? formatINR(e.salary) : "-"}</td>}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
