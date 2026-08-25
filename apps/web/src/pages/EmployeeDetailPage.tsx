import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Input, ConfirmDialog } from "@office/ui";
import { UpdateEmployeeSchema, CreateAppraisalSchema, type UpdateEmployeeInput, type CreateAppraisalInput } from "@office/validation";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type {
  EmployeeDetail,
  DepartmentSummary,
  TeamSummary,
  WorkScheduleSummary,
  AppraisalSummary,
} from "@office/shared";
import { useState } from "react";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-sm text-text">{value}</div>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canUpdate = user?.permissions.includes("employees.update");
  const canArchive = user?.permissions.includes("employees.archive");
  const canViewSalary = user?.permissions.includes("salary.view");
  const canViewAppraisals = user?.permissions.includes("appraisals.view");
  const canCreateAppraisal = user?.permissions.includes("appraisals.create");
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get<{ employee: EmployeeDetail }>(`/api/employees/${id}`),
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ departments: DepartmentSummary[] }>("/api/departments"),
    enabled: !!canUpdate,
  });
  const { data: teamData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<{ teams: TeamSummary[] }>("/api/teams"),
    enabled: !!canUpdate,
  });
  const { data: scheduleData } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get<{ schedules: WorkScheduleSummary[] }>("/api/schedules"),
    enabled: !!canUpdate,
  });
  const { data: appraisalData } = useQuery({
    queryKey: ["employee-appraisals", id],
    queryFn: () => api.get<{ appraisals: AppraisalSummary[] }>(`/api/employees/${id}/appraisals`),
    enabled: !!canViewAppraisals,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEmployeeInput>({ resolver: zodResolver(UpdateEmployeeSchema) });

  const {
    register: registerAppraisal,
    handleSubmit: handleSubmitAppraisal,
    reset: resetAppraisal,
    formState: { errors: appraisalErrors, isSubmitting: isSubmittingAppraisal },
  } = useForm<CreateAppraisalInput>({ resolver: zodResolver(CreateAppraisalSchema) });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEmployeeInput) => api.patch(`/api/employees/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEditing(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post(`/api/employees/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setConfirmArchive(false);
      navigate("/employees");
    },
  });

  const appraisalMutation = useMutation({
    mutationFn: (input: CreateAppraisalInput) => api.post(`/api/employees/${id}/appraisals`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-appraisals", id] });
      resetAppraisal();
      setShowAppraisalForm(false);
    },
  });

  if (isLoading) {
    return <p className="text-text-muted">Loading...</p>;
  }
  if (isError || !data?.employee) {
    return <p className="text-danger">Employee not found.</p>;
  }

  const e = data.employee;

  function openEdit() {
    reset({
      fullName: e.fullName,
      jobTitle: e.jobTitle,
      salary: e.salary ?? undefined,
      departmentId: e.departmentId ?? "",
      teamId: e.teamId ?? "",
      scheduleId: e.scheduleId ?? "",
    });
    setEditing(true);
  }

  return (
    <div>
      <Link to="/employees" className="mb-4 inline-block text-sm text-text-muted hover:text-primary">
        &larr; Back to Employees
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{e.fullName}</h1>
        <div className="flex items-center gap-3">
          <Badge variant={e.status === "ACTIVE" ? "success" : "warning"}>{e.status}</Badge>
          {canUpdate && e.status === "ACTIVE" && !editing && (
            <Button variant="secondary" onClick={openEdit}>
              Edit
            </Button>
          )}
          {canArchive && e.status === "ACTIVE" && (
            <Button variant="danger" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={handleSubmit((formData) => updateMutation.mutate(formData))}
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
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {updateMutation.isError && <p className="text-sm text-danger">Failed to save changes.</p>}
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Onboarding Details
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Job Title" value={e.jobTitle} />
            <Field label="Email" value={e.email} />
            <Field label="Hire Date" value={new Date(e.hireDate).toLocaleDateString()} />
            <Field label="Department" value={e.department?.name ?? "Unassigned"} />
            <Field label="Team" value={e.team?.name ?? "Unassigned"} />
            <Field label="Work Schedule" value={e.schedule?.name ?? "Unassigned"} />
            {e.salary != null && <Field label="Salary" value={`$${e.salary}`} />}
            <Field label="Login Account" value={e.user?.email ?? "No login created"} />
            <Field label="Added On" value={new Date(e.createdAt).toLocaleString()} />
            <Field label="Last Updated" value={new Date(e.updatedAt).toLocaleString()} />
          </div>
        </div>
      )}

      {canViewAppraisals && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Appraisal History
            </h2>
            {canCreateAppraisal && (
              <Button
                variant="secondary"
                onClick={() => setShowAppraisalForm((s) => !s)}
              >
                {showAppraisalForm ? "Cancel" : "Add Appraisal"}
              </Button>
            )}
          </div>

          {showAppraisalForm && canCreateAppraisal && (
            <form
              onSubmit={handleSubmitAppraisal((formData) => appraisalMutation.mutate(formData))}
              className="mb-6 grid grid-cols-1 gap-4 rounded-md border border-border p-4 sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">Appraisal Date</label>
                <Input type="date" {...registerAppraisal("appraisalDate")} />
                {appraisalErrors.appraisalDate && (
                  <p className="mt-1 text-xs text-danger">{appraisalErrors.appraisalDate.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Percentage Hike (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...registerAppraisal("percentageHike", { valueAsNumber: true })}
                />
                {appraisalErrors.percentageHike && (
                  <p className="mt-1 text-xs text-danger">{appraisalErrors.percentageHike.message}</p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input {...registerAppraisal("notes")} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={isSubmittingAppraisal || appraisalMutation.isPending}>
                  {appraisalMutation.isPending ? "Saving..." : "Save Appraisal"}
                </Button>
                {appraisalMutation.isError && (
                  <p className="mt-2 text-sm text-danger">Failed to save appraisal.</p>
                )}
              </div>
            </form>
          )}

          {appraisalData?.appraisals.length ? (
            <ul className="divide-y divide-border">
              {appraisalData.appraisals.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text">
                      {new Date(a.appraisalDate).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-semibold text-success">
                      +{a.percentageHike}%
                    </span>
                  </div>
                  {a.notes && <p className="mt-1 text-sm text-text-secondary">{a.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No appraisals recorded yet.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive Employee"
        description={`Are you sure you want to archive ${e.fullName}? Their record will be kept but marked inactive.`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutate()}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}
