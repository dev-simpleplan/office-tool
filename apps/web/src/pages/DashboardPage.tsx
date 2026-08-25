import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@office/ui";
import { Users, UserCheck, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { EmployeeSummary } from "@office/shared";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canViewEmployees = user?.permissions.includes("employees.view");

  const { data } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
    enabled: !!canViewEmployees,
  });

  const employees = data?.employees ?? [];
  const active = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Employees" value={employees.length} icon={<Users size={20} />} />
        <StatCard label="Active" value={active} icon={<UserCheck size={20} />} />
        <StatCard label="Your Role" value={user?.roleName ?? "-"} icon={<ShieldCheck size={20} />} />
      </div>
    </div>
  );
}
