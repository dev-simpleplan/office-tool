import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@office/ui";
import { api } from "../lib/api";
import type { EmployeeDetail } from "@office/shared";

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get<{ employee: EmployeeDetail }>(`/api/employees/${id}`),
  });

  if (isLoading) {
    return <p className="text-text-muted">Loading...</p>;
  }
  if (isError || !data?.employee) {
    return <p className="text-danger">Employee not found.</p>;
  }

  const e = data.employee;

  return (
    <div>
      <Link to="/employees" className="mb-4 inline-block text-sm text-text-muted hover:text-primary">
        &larr; Back to Employees
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{e.fullName}</h1>
        <Badge variant={e.status === "ACTIVE" ? "success" : "warning"}>{e.status}</Badge>
      </div>

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
    </div>
  );
}
