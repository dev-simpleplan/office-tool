import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Input, ConfirmDialog, Avatar, DatePicker } from "@office/ui";
import {
  UpdateEmployeeSchema,
  CreateAppraisalSchema,
  CreateLoginSchema,
  CreateLeaveRequestSchema,
  LEAVE_TYPES,
  type UpdateEmployeeInput,
  type CreateAppraisalInput,
  type CreateLoginInput,
  type CreateLeaveRequestInput,
  ASSIGNABLE_ROLES,
} from "@office/validation";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useEmployeePhoto } from "../lib/useEmployeePhoto";
import type {
  EmployeeDetail,
  DepartmentSummary,
  TeamSummary,
  WorkScheduleSummary,
  AppraisalSummary,
  LeaveRequestSummary,
} from "@office/shared";
import { useRef, useState } from "react";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-sm text-text">{value}</div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", TEAM_LEAD: "Team Lead", EMPLOYEE: "Employee" };

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canUpdate = user?.permissions.includes("employees.update");
  const canArchive = user?.permissions.includes("employees.archive");
  const canDelete = user?.permissions.includes("employees.delete");
  const canAssignRoles = user?.permissions.includes("roles.assign");
  const canViewSalary = user?.permissions.includes("salary.view");
  const canViewAppraisals = user?.permissions.includes("appraisals.view");
  const canCreateAppraisal = user?.permissions.includes("appraisals.create");
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingRole, setPendingRole] = useState<(typeof ASSIGNABLE_ROLES)[number] | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [editingAppraisalId, setEditingAppraisalId] = useState<string | null>(null);
  const [deleteAppraisalId, setDeleteAppraisalId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
  const { data: leaveData } = useQuery({
    queryKey: ["employee-leave-requests", id],
    queryFn: () => api.get<{ leaveRequests: LeaveRequestSummary[] }>(`/api/employees/${id}/leave-requests`),
  });

  const {
    register,
    handleSubmit,
    reset,
    control: employeeControl,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEmployeeInput>({ resolver: zodResolver(UpdateEmployeeSchema) });

  const {
    register: registerAppraisal,
    handleSubmit: handleSubmitAppraisal,
    reset: resetAppraisal,
    control: appraisalControl,
    formState: { errors: appraisalErrors, isSubmitting: isSubmittingAppraisal },
  } = useForm<CreateAppraisalInput>({ resolver: zodResolver(CreateAppraisalSchema) });

  const {
    register: registerLeave,
    handleSubmit: handleSubmitLeave,
    reset: resetLeave,
    control: leaveControl,
    watch: watchLeave,
    formState: { errors: leaveErrors, isSubmitting: isSubmittingLeave },
  } = useForm<CreateLeaveRequestInput>({ resolver: zodResolver(CreateLeaveRequestSchema) });
  const leaveStartDate = watchLeave("startDate");

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    reset: resetLogin,
    formState: { errors: loginErrors, isSubmitting: isSubmittingLogin },
  } = useForm<CreateLoginInput>({ resolver: zodResolver(CreateLoginSchema) });

  const passwordForm = useForm<{ currentPassword: string; newPassword: string }>();

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

  const roleMutation = useMutation({
    mutationFn: (role: (typeof ASSIGNABLE_ROLES)[number]) => api.patch(`/api/employees/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      setPendingRole(null);
    },
    onError: () => {
      setPendingRole(null);
      setRoleError("Failed to change role.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.removeQueries({ queryKey: ["employee", id] });
      setConfirmDelete(false);
      navigate("/employees");
    },
    onError: (err) => {
      setConfirmDelete(false);
      setDeleteError(
        err instanceof ApiError && (err.body as { error?: string } | null)?.error === "cannot_delete_self"
          ? "You can't delete your own account."
          : "Failed to delete employee.",
      );
    },
  });

  function invalidateAppraisalData() {
    queryClient.invalidateQueries({ queryKey: ["employee-appraisals", id] });
    queryClient.invalidateQueries({ queryKey: ["employee", id] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  }

  const appraisalMutation = useMutation({
    mutationFn: (input: CreateAppraisalInput) => api.post(`/api/employees/${id}/appraisals`, input),
    onSuccess: () => {
      invalidateAppraisalData();
      resetAppraisal();
      setShowAppraisalForm(false);
    },
  });

  const updateAppraisalMutation = useMutation({
    mutationFn: (input: CreateAppraisalInput) =>
      api.patch(`/api/employees/${id}/appraisals/${editingAppraisalId}`, input),
    onSuccess: () => {
      invalidateAppraisalData();
      resetAppraisal();
      setEditingAppraisalId(null);
      setShowAppraisalForm(false);
    },
  });

  const deleteAppraisalMutation = useMutation({
    mutationFn: (appraisalId: string) => api.delete(`/api/employees/${id}/appraisals/${appraisalId}`),
    onSuccess: () => {
      invalidateAppraisalData();
      setDeleteAppraisalId(null);
    },
  });

  function invalidateLeaveData() {
    queryClient.invalidateQueries({ queryKey: ["employee-leave-requests", id] });
    queryClient.invalidateQueries({ queryKey: ["employee", id] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  }

  const leaveMutation = useMutation({
    mutationFn: (input: CreateLeaveRequestInput) => api.post(`/api/employees/${id}/leave-requests`, input),
    onSuccess: () => {
      invalidateLeaveData();
      resetLeave();
      setShowLeaveForm(false);
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (leaveId: string) => api.delete(`/api/employees/${id}/leave-requests/${leaveId}`),
    onSuccess: () => {
      invalidateLeaveData();
      setDeleteLeaveId(null);
    },
  });

  const createLoginMutation = useMutation({
    mutationFn: (input: CreateLoginInput) => api.post(`/api/employees/${id}/create-login`, input),
    onSuccess: () => {
      setLoginError(null);
      resetLogin();
      setShowLoginForm(false);
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
    },
    onError: (err) => {
      const body = (err as { body?: { error?: string } }).body;
      setLoginError(
        body?.error === "email_already_has_account"
          ? "An account with this email already exists."
          : "Failed to create login.",
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post("/api/auth/change-password", input),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSuccess(true);
      passwordForm.reset();
      setTimeout(() => setShowPasswordForm(false), 1500);
    },
    onError: (err) => {
      const status = (err as { status?: number }).status;
      setPasswordSuccess(false);
      setPasswordError(status === 401 ? "Current password is incorrect." : "Failed to change password.");
    },
  });

  const photoUrl = useEmployeePhoto(id, data?.employee.hasPhoto ?? false);

  const photoMutation = useMutation({
    mutationFn: (file: File) => api.postFile(`/api/employees/${id}/photo`, file),
    onSuccess: () => {
      setPhotoError(null);
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: () => setPhotoError("Failed to upload photo. Use a JPEG, PNG, or WEBP under 5MB."),
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      photoMutation.mutate(file);
    }
    e.target.value = "";
  }

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
      dateOfBirth: e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : "",
      salary: e.salary ?? undefined,
      departmentId: e.departmentId ?? "",
      teamId: e.teamId ?? "",
      scheduleId: e.scheduleId ?? "",
      leavesAvailable: e.leavesAvailable,
    });
    setEditing(true);
  }

  return (
    <div>
      <Link to="/employees" className="mb-4 inline-block text-sm text-text-muted hover:text-primary">
        &larr; Back to Employees
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 [&_.op-avatar]:h-16 [&_.op-avatar]:w-16 [&_.op-avatar]:text-xl">
              <Avatar name={e.fullName} photoUrl={photoUrl} />
            </div>
            {canUpdate && e.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-muted hover:text-primary"
                disabled={photoMutation.isPending}
              >
                {photoMutation.isPending ? "..." : "Edit"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <h1 className="text-2xl font-bold">{e.fullName}</h1>
        </div>
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
          {canDelete && user?.employeeId !== e.id && (
            <Button
              variant="secondary"
              className="text-danger"
              onClick={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      {deleteError && <p className="mb-4 text-sm text-danger">{deleteError}</p>}
      {photoError && <p className="mb-4 text-sm text-danger">{photoError}</p>}

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
          <div>
            <label className="mb-1 block text-sm font-medium">Date of Birth</label>
            <Controller
              name="dateOfBirth"
              control={employeeControl}
              render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
            />
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
          <div>
            <label className="mb-1 block text-sm font-medium">Annual Leave Allowance (days/year)</label>
            <Input type="number" {...register("leavesAvailable", { valueAsNumber: true })} />
            <p className="mt-1 text-xs text-text-muted">
              Days taken are tracked in Leave History below and can't be edited directly here.
            </p>
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
            <Field
              label="Date of Birth"
              value={e.dateOfBirth ? new Date(e.dateOfBirth).toLocaleDateString() : "Not set"}
            />
            <Field label="Department" value={e.department?.name ?? "Unassigned"} />
            <Field label="Team" value={e.team?.name ?? "Unassigned"} />
            <Field label="Work Schedule" value={e.schedule?.name ?? "Unassigned"} />
            {e.startingSalary != null && (
              <Field label="Starting Salary" value={`$${e.startingSalary}`} />
            )}
            {e.salary != null && (
              <Field
                label="Current Salary"
                value={
                  e.startingSalary != null && e.startingSalary > 0
                    ? `$${e.salary} (${e.salary >= e.startingSalary ? "+" : ""}${(
                        ((e.salary - e.startingSalary) / e.startingSalary) *
                        100
                      ).toFixed(1)}%)`
                    : `$${e.salary}`
                }
              />
            )}
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-text-muted">Login Account</div>
              <div className="mt-1 flex items-center gap-3 text-sm text-text">
                {e.user?.email ?? "No login created"}
                {!e.user && canUpdate && e.status === "ACTIVE" && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setShowLoginForm((s) => !s)}
                  >
                    {showLoginForm ? "Cancel" : "Create Login"}
                  </button>
                )}
                {user?.employeeId === e.id && e.user && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => {
                      setPasswordSuccess(false);
                      setPasswordError(null);
                      setShowPasswordForm((s) => !s);
                    }}
                  >
                    {showPasswordForm ? "Cancel" : "Change Password"}
                  </button>
                )}
              </div>
              {e.user && (
                <div className="mt-2 flex items-center gap-3 text-sm text-text">
                  <span className="text-text-muted">Role:</span>
                  {canAssignRoles && user?.employeeId !== e.id ? (
                    <select
                      className="op-input w-auto"
                      value={e.user.roleName}
                      onChange={(ev) => {
                        setRoleError(null);
                        const next = ev.target.value as (typeof ASSIGNABLE_ROLES)[number];
                        if (next !== e.user?.roleName) setPendingRole(next);
                      }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={e.user.roleName === "ADMIN" ? "warning" : "default"}>
                      {ROLE_LABEL[e.user.roleName]}
                    </Badge>
                  )}
                  {roleError && <span className="text-xs text-danger">{roleError}</span>}
                </div>
              )}
              {showLoginForm && (
                <form
                  onSubmit={handleSubmitLogin((formData) => createLoginMutation.mutate(formData))}
                  className="mt-3 flex max-w-sm items-start gap-2"
                >
                  <div className="flex-1">
                    <Input type="text" placeholder="Temporary password" {...registerLogin("password")} />
                    {loginErrors.password && (
                      <p className="mt-1 text-xs text-danger">{loginErrors.password.message}</p>
                    )}
                    {loginError && <p className="mt-1 text-xs text-danger">{loginError}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmittingLogin || createLoginMutation.isPending}>
                    Create
                  </Button>
                </form>
              )}
              {showPasswordForm && (
                <form
                  onSubmit={passwordForm.handleSubmit((formData) => changePasswordMutation.mutate(formData))}
                  className="mt-3 max-w-sm space-y-2"
                >
                  <Input
                    type="password"
                    placeholder="Current password"
                    {...passwordForm.register("currentPassword", { required: true })}
                  />
                  <Input
                    type="password"
                    placeholder="New password (min 8 characters)"
                    {...passwordForm.register("newPassword", { required: true, minLength: 8 })}
                  />
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? "Saving..." : "Update Password"}
                    </Button>
                    {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
                    {passwordSuccess && <p className="text-xs text-success">Password updated.</p>}
                  </div>
                </form>
              )}
            </div>
            <Field label="Added On" value={new Date(e.createdAt).toLocaleString()} />
            <Field label="Last Updated" value={new Date(e.updatedAt).toLocaleString()} />
          </div>

          <h2 className="mb-4 mt-8 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Leave Balance
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Field label="Annual Allowance" value={`${e.leavesAvailable} days`} />
            <Field label="Taken" value={`${e.leavesTaken} days`} />
            <Field label="Remaining" value={`${e.leavesAvailable - e.leavesTaken} days`} />
          </div>
        </div>
      )}

      {canUpdate && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Leave History</h2>
            <Button
              variant="secondary"
              onClick={() => {
                if (showLeaveForm) {
                  resetLeave();
                }
                setShowLeaveForm((s) => !s);
              }}
            >
              {showLeaveForm ? "Cancel" : "Add Leave"}
            </Button>
          </div>

          {showLeaveForm && (
            <form
              onSubmit={handleSubmitLeave((formData) => leaveMutation.mutate(formData))}
              className="mb-6 grid grid-cols-1 gap-4 rounded-md border border-border p-4 sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">Start Date</label>
                <Controller
                  name="startDate"
                  control={leaveControl}
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
                {leaveErrors.startDate && (
                  <p className="mt-1 text-xs text-danger">{leaveErrors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">End Date</label>
                <Controller
                  name="endDate"
                  control={leaveControl}
                  render={({ field }) => (
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} min={leaveStartDate || undefined} />
                  )}
                />
                {leaveErrors.endDate && <p className="mt-1 text-xs text-danger">{leaveErrors.endDate.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select className="op-input" {...registerLeave("type")}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input {...registerLeave("notes")} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={isSubmittingLeave || leaveMutation.isPending}>
                  {leaveMutation.isPending ? "Saving..." : "Save Leave"}
                </Button>
                {leaveMutation.isError && <p className="mt-2 text-sm text-danger">Failed to save leave.</p>}
              </div>
            </form>
          )}

          {leaveData?.leaveRequests.length ? (
            <ul className="divide-y divide-border">
              {leaveData.leaveRequests.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text">
                        {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-semibold text-text-secondary">
                        {l.days} day{l.days === 1 ? "" : "s"} · {l.type}
                      </span>
                    </div>
                    {l.notes && <p className="mt-1 text-sm text-text-secondary">{l.notes}</p>}
                  </div>
                  <button
                    type="button"
                    className="text-sm text-text-muted hover:text-danger"
                    onClick={() => setDeleteLeaveId(l.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No leave recorded yet.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteLeaveId}
        title="Delete Leave"
        description="This will remove the leave record and recalculate the employee's leave balance."
        warning="This permanently deletes the employee, their login, and their history, and cannot be undone. To keep their records, use Archive instead."
        confirmLabel="Delete"
        pending={deleteLeaveMutation.isPending}
        onConfirm={() => deleteLeaveId && deleteLeaveMutation.mutate(deleteLeaveId)}
        onCancel={() => setDeleteLeaveId(null)}
      />

      {canViewAppraisals && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Appraisal History
            </h2>
            {canCreateAppraisal && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (showAppraisalForm) {
                    setShowAppraisalForm(false);
                    setEditingAppraisalId(null);
                    resetAppraisal();
                  } else {
                    resetAppraisal({ appraisalDate: "", percentageHike: undefined, notes: "" });
                    setEditingAppraisalId(null);
                    setShowAppraisalForm(true);
                  }
                }}
              >
                {showAppraisalForm ? "Cancel" : "Add Appraisal"}
              </Button>
            )}
          </div>

          {showAppraisalForm && canCreateAppraisal && (
            <form
              onSubmit={handleSubmitAppraisal((formData) =>
                editingAppraisalId
                  ? updateAppraisalMutation.mutate(formData)
                  : appraisalMutation.mutate(formData),
              )}
              className="mb-6 grid grid-cols-1 gap-4 rounded-md border border-border p-4 sm:grid-cols-3"
            >
              {editingAppraisalId && (
                <p className="sm:col-span-3 text-sm text-text-muted">Editing appraisal</p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Appraisal Date</label>
                <Controller
                  name="appraisalDate"
                  control={appraisalControl}
                  render={({ field }) => <DatePicker value={field.value ?? ""} onChange={field.onChange} />}
                />
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
                <Button
                  type="submit"
                  disabled={isSubmittingAppraisal || appraisalMutation.isPending || updateAppraisalMutation.isPending}
                >
                  {appraisalMutation.isPending || updateAppraisalMutation.isPending
                    ? "Saving..."
                    : editingAppraisalId
                      ? "Update Appraisal"
                      : "Save Appraisal"}
                </Button>
                {(appraisalMutation.isError || updateAppraisalMutation.isError) && (
                  <p className="mt-2 text-sm text-danger">Failed to save appraisal.</p>
                )}
              </div>
            </form>
          )}

          {appraisalData?.appraisals.length ? (
            <ul className="divide-y divide-border">
              {appraisalData.appraisals.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text">
                        {new Date(a.appraisalDate).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-semibold text-success">+{a.percentageHike}%</span>
                    </div>
                    {a.notes && <p className="mt-1 text-sm text-text-secondary">{a.notes}</p>}
                  </div>
                  {canCreateAppraisal && (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        className="text-sm text-text-muted hover:text-primary"
                        onClick={() => {
                          resetAppraisal({
                            appraisalDate: a.appraisalDate.slice(0, 10),
                            percentageHike: a.percentageHike,
                            notes: a.notes ?? "",
                          });
                          setEditingAppraisalId(a.id);
                          setShowAppraisalForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm text-text-muted hover:text-danger"
                        onClick={() => setDeleteAppraisalId(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
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

      <ConfirmDialog
        open={!!pendingRole}
        title="Change Role"
        warning={
          pendingRole === "ADMIN"
            ? "Admins can see salaries, manage every record, and permanently delete data."
            : undefined
        }
        description={`Change ${e.fullName}'s role to ${pendingRole ? ROLE_LABEL[pendingRole] : ""}? It takes effect immediately.`}
        confirmLabel="Change Role"
        danger={false}
        pending={roleMutation.isPending}
        onConfirm={() => pendingRole && roleMutation.mutate(pendingRole)}
        onCancel={() => setPendingRole(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Employee"
        description={`Permanently delete ${e.fullName}? This cannot be undone. Their login, appraisals, leave history, time entries, and any comments or files they added are removed. Tasks assigned to them become unassigned.`}
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={!!deleteAppraisalId}
        title="Delete Appraisal"
        description="This will remove the appraisal and recalculate the employee's current salary from the remaining history."
        confirmLabel="Delete"
        pending={deleteAppraisalMutation.isPending}
        onConfirm={() => deleteAppraisalId && deleteAppraisalMutation.mutate(deleteAppraisalId)}
        onCancel={() => setDeleteAppraisalId(null)}
      />
    </div>
  );
}
