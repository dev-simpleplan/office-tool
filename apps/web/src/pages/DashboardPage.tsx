import { useQuery } from "@tanstack/react-query";
import { StatCard, Badge } from "@office/ui";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  UsersRound,
  FolderKanban,
  ListChecks,
  AlertTriangle,
  Cake,
  Gift,
  Clock,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { AdminDashboardData, TeamLeadDashboardData, EmployeeDashboardData, DashboardData } from "@office/shared";

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });
}

function priorityVariant(p: string) {
  if (p === "URGENT" || p === "HIGH") return "danger" as const;
  if (p === "MEDIUM") return "warning" as const;
  return "default" as const;
}

function utilizationVariant(u: number | null) {
  if (u === null) return "default" as const;
  if (u > 1) return "danger" as const;
  if (u < 0.5) return "warning" as const;
  return "success" as const;
}

function WorkloadBar({ utilization, hasSchedule }: { utilization: number | null; hasSchedule: boolean }) {
  if (!hasSchedule) return <Badge variant="default">No schedule set</Badge>;
  if (utilization === null) return <Badge variant="default">-</Badge>;
  const pct = Math.min(100, Math.round(utilization * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-background">
        <div
          className={`h-full ${utilization > 1 ? "bg-danger" : utilization < 0.5 ? "bg-warning" : "bg-success"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Badge variant={utilizationVariant(utilization)}>{Math.round(utilization * 100)}%</Badge>
    </div>
  );
}

function AdminDashboard({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Employees" value={data.employeeCount} icon={<Users size={20} />} />
        <StatCard label="Active Employees" value={data.activeEmployeeCount} icon={<Users size={20} />} />
        <StatCard label="Departments" value={data.departmentCount} icon={<Building2 size={20} />} />
        <StatCard label="Teams" value={data.teamCount} icon={<UsersRound size={20} />} />
        <StatCard label="Active Projects" value={data.activeProjectCount} icon={<FolderKanban size={20} />} />
        <StatCard label="Tasks" value={data.taskCount} icon={<ListChecks size={20} />} />
        <StatCard label="Completion Rate" value={`${Math.round(data.completionRate * 100)}%`} icon={<ListChecks size={20} />} />
        <StatCard label="Overdue Tasks" value={data.overdueTaskCount} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Cake size={16} /> Upcoming Birthdays</h2>
          {data.upcomingBirthdays.length === 0 && <p className="text-sm text-text-muted">None in the next 30 days.</p>}
          <ul className="space-y-1 text-sm">
            {data.upcomingBirthdays.map((b) => (
              <li key={b.employeeId} className="flex justify-between">
                <span>{b.fullName}</span>
                <span className="text-text-muted">{new Date(b.nextOccurrence).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Gift size={16} /> Upcoming Work Anniversaries</h2>
          {data.upcomingAnniversaries.length === 0 && <p className="text-sm text-text-muted">None in the next 30 days.</p>}
          <ul className="space-y-1 text-sm">
            {data.upcomingAnniversaries.map((b) => (
              <li key={b.employeeId} className="flex justify-between">
                <span>{b.fullName}</span>
                <span className="text-text-muted">{new Date(b.nextOccurrence).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Clock size={16} /> Company Workload (this week)</h2>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between"><span>Total capacity</span><span>{Math.round(data.companyWorkload.totalCapacity)}h</span></li>
            <li className="flex justify-between"><span>Total assigned</span><span>{Math.round(data.companyWorkload.totalAssigned)}h</span></li>
            <li className="flex justify-between"><span>With schedule</span><span>{data.companyWorkload.employeesWithSchedule}</span></li>
            <li className="flex justify-between"><span>Without schedule</span><span>{data.companyWorkload.employeesWithoutSchedule}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TeamLeadDashboard({ data }: { data: TeamLeadDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Team" value={data.teamName ?? "No team"} icon={<UsersRound size={20} />} />
        <StatCard label="Team Members" value={data.memberCount} icon={<Users size={20} />} />
        <StatCard label="Overdue Tasks" value={data.overdueTasks.length} icon={<AlertTriangle size={20} />} />
        <StatCard label="Team Hours This Week" value={Math.round(data.teamHoursThisWeek)} icon={<Clock size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TaskListCard title="Today's Tasks" tasks={data.todaysTasks} />
        <TaskListCard title="Overdue Tasks" tasks={data.overdueTasks} />
        <TaskListCard title="Blocked Tasks" tasks={data.blockedTasks} />
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 font-semibold">Team Projects</h2>
          {data.teamProjects.length === 0 && <p className="text-sm text-text-muted">No projects.</p>}
          <ul className="space-y-1 text-sm">
            {data.teamProjects.map((p) => (
              <li key={p.id}><Link className="hover:text-primary" to={`/projects/${p.id}`}>{p.name}</Link> <Badge>{p.status}</Badge></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Team Workload (this week)</h2>
          <Link to="/team/workload" className="text-sm text-primary hover:underline">Full view</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr><th className="py-1">Member</th><th>Capacity</th><th>Assigned</th><th>Utilization</th></tr>
            </thead>
            <tbody>
              {data.teamWorkload.map((w) => (
                <tr key={w.employeeId} className="border-t border-border">
                  <td className="py-1">{w.fullName}</td>
                  <td>{w.hasSchedule ? `${Math.round(w.capacityHours ?? 0)}h` : "-"}</td>
                  <td>{Math.round(w.assignedHours)}h</td>
                  <td><WorkloadBar utilization={w.utilization} hasSchedule={w.hasSchedule} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TaskListCard({ title, tasks }: { title: string; tasks: EmployeeDashboardData["todaysTasks"] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {tasks.length === 0 && <p className="text-sm text-text-muted">Nothing here.</p>}
      <ul className="space-y-1 text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <Link className="min-w-0 truncate hover:text-primary" to={`/tasks/${t.id}`}>{t.title}</Link>
            <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmployeeDashboard({ data }: { data: EmployeeDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Completed Tasks" value={data.completedTaskCount} icon={<ListChecks size={20} />} />
        <StatCard label="Overdue Tasks" value={data.overdueTasks.length} icon={<AlertTriangle size={20} />} />
        <StatCard label="Hours Logged (this week)" value={Math.round(data.hoursLoggedThisWeek)} icon={<Clock size={20} />} />
        <StatCard
          label="Weekly Progress"
          value={`${data.weeklyProgress.completed}/${data.weeklyProgress.total}`}
          icon={<ListChecks size={20} />}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TaskListCard title="Today's Tasks" tasks={data.todaysTasks} />
        <TaskListCard title="Overdue Tasks" tasks={data.overdueTasks} />
        <TaskListCard title="Upcoming Deadlines" tasks={data.upcomingDeadlines} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data?.role === "ADMIN" && <AdminDashboard data={data} />}
      {data?.role === "TEAM_LEAD" && <TeamLeadDashboard data={data} />}
      {data?.role === "EMPLOYEE" && <EmployeeDashboard data={data} />}
      {!isLoading && !data && <p className="text-text-muted">No dashboard data for {user?.roleName}.</p>}
    </div>
  );
}
