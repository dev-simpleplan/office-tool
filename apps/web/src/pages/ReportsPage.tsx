import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, StatCard, Table, DateRangePicker, computePresetRange, type DateRange, type DateRangePreset } from "@office/ui";
import { api } from "../lib/api";
import { downloadCsv } from "../lib/csv";
import { useAuthStore } from "../store/authStore";
import { isLeadRole } from "@office/shared";
import type { EmployeeReport, TeamReport, ProjectReport, CompanyReport, EmployeeSummary, TeamSummary, ProjectSummary } from "@office/shared";

type Tab = "employee" | "team" | "project" | "company";

function useRange() {
  const [preset, setPreset] = useState<DateRangePreset>("this_week");
  const [range, setRange] = useState<DateRange>(() => computePresetRange("this_week"));
  return { preset, range, onChange: (r: DateRange, p: DateRangePreset) => { setRange(r); setPreset(p); } };
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roleName === "ADMIN";
  const isTeamLead = isLeadRole(user?.roleName);
  const isEmployee = user?.roleName === "EMPLOYEE";

  const availableTabs = useMemo<Tab[]>(() => {
    const tabs: Tab[] = ["employee"];
    if (isAdmin || isTeamLead) tabs.push("team");
    if (isAdmin || isTeamLead || isEmployee) tabs.push("project");
    if (isAdmin) tabs.push("company");
    return tabs;
  }, [isAdmin, isTeamLead, isEmployee]);

  const [tab, setTab] = useState<Tab>("employee");
  const activeTab = availableTabs.includes(tab) ? tab : availableTabs[0];

  const { range, preset, onChange } = useRange();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Reports</h1>
      <p className="mb-6 text-sm text-text-muted">Employee, team, project, and company performance reports.</p>

      <div className="mb-6 flex gap-2 border-b border-border">
        {availableTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === t ? "border-b-2 border-primary text-primary" : "text-text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <DateRangePicker value={range} preset={preset} onChange={onChange} />
      </div>

      {activeTab === "employee" && <EmployeeReportView start={range.start} end={range.end} />}
      {activeTab === "team" && <TeamReportView start={range.start} end={range.end} />}
      {activeTab === "project" && <ProjectReportView start={range.start} end={range.end} />}
      {activeTab === "company" && <CompanyReportView start={range.start} end={range.end} />}
    </div>
  );
}

function EmployeeReportView({ start, end }: { start: string; end: string }) {
  const user = useAuthStore((s) => s.user);
  const isRestricted = user?.roleName === "EMPLOYEE";
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<{ employees: EmployeeSummary[] }>("/api/employees"),
    enabled: !isRestricted,
  });
  const [employeeId, setEmployeeId] = useState<string>(user?.employeeId ?? "");

  const targetId = isRestricted ? user?.employeeId ?? "" : employeeId;
  const { data, isLoading } = useQuery({
    queryKey: ["report-employee", targetId, start, end],
    queryFn: () => api.get<EmployeeReport>(`/api/reports/employee/${targetId}?start=${start}&end=${end}`),
    enabled: !!targetId,
  });

  return (
    <div>
      {!isRestricted && (
        <div className="mb-4 max-w-xs">
          <select
            className="op-input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select employee...</option>
            {employees?.employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </select>
        </div>
      )}
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Tasks Completed" value={`${data.tasksCompleted}/${data.totalTasks}`} />
            <StatCard label="Completion Rate" value={pct(data.completionRate)} />
            <StatCard label="Hours Logged" value={`${Math.round(data.hoursLogged)}h`} />
            <StatCard label="Estimated Hours" value={`${Math.round(data.estimatedHours)}h`} />
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(`employee-report-${data.fullName.replace(/\s+/g, "-")}.csv`, [
                { employee: data.fullName, start: data.start, end: data.end, tasksCompleted: data.tasksCompleted, totalTasks: data.totalTasks, completionRate: data.completionRate, hoursLogged: data.hoursLogged, estimatedHours: data.estimatedHours },
              ])
            }
          >
            Export CSV
          </Button>
        </>
      )}
    </div>
  );
}

function TeamReportView({ start, end }: { start: string; end: string }) {
  const user = useAuthStore((s) => s.user);
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<{ teams: TeamSummary[] }>("/api/teams"),
    enabled: user?.roleName === "ADMIN",
  });
  const [teamId, setTeamId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-team", teamId, start, end],
    queryFn: () => api.get<TeamReport>(`/api/reports/team/${teamId}?start=${start}&end=${end}`),
    enabled: !!teamId,
  });

  return (
    <div>
      {user?.roleName === "ADMIN" ? (
        <div className="mb-4 max-w-xs">
          <select className="op-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Select team...</option>
            {teams?.teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <TeamLeadTeamLoader onLoaded={setTeamId} teamId={teamId} />
      )}
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Members" value={data.memberCount} />
            <StatCard label="Utilization" value={data.utilization === null ? "-" : pct(data.utilization)} />
            <StatCard label="Tasks Completed" value={`${data.tasksCompleted}/${data.totalTasks}`} />
            <StatCard label="Completion Rate" value={pct(data.completionRate)} />
          </div>
          <Table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Capacity</th>
                <th>Assigned</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.employeeId}>
                  <td>{m.fullName}</td>
                  <td>{m.hasSchedule ? `${Math.round(m.capacityHours ?? 0)}h` : "Unknown"}</td>
                  <td>{Math.round(m.assignedHours)}h</td>
                  <td>{m.utilization === null ? "-" : pct(m.utilization)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `team-report-${data.teamName.replace(/\s+/g, "-")}.csv`,
                  data.members.map((m) => ({ member: m.fullName, capacityHours: m.capacityHours, assignedHours: m.assignedHours, utilization: m.utilization })),
                )
              }
            >
              Export CSV
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function TeamLeadTeamLoader({ teamId, onLoaded }: { teamId: string; onLoaded: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ teamId: string | null; teamName: string | null }>("/api/dashboard"),
  });
  useEffect(() => {
    if (data?.teamId && data.teamId !== teamId) {
      onLoaded(data.teamId);
    }
  }, [data?.teamId, teamId, onLoaded]);
  return <p className="mb-4 text-sm text-text-muted">Team: {data?.teamName ?? "-"}</p>;
}

function ProjectReportView({ start, end }: { start: string; end: string }) {
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ projects: ProjectSummary[] }>("/api/projects"),
  });
  const [projectId, setProjectId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-project", projectId, start, end],
    queryFn: () => api.get<ProjectReport>(`/api/reports/project/${projectId}?start=${start}&end=${end}`),
    enabled: !!projectId,
  });

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <select className="op-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select project...</option>
          {projects?.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Progress" value={pct(data.progress)} />
            <StatCard label="Total Tasks" value={data.totalTasks} />
            <StatCard label="Estimated Hours" value={`${Math.round(data.estimatedHours)}h`} />
            <StatCard label="Actual Hours" value={`${Math.round(data.actualHours)}h`} />
          </div>
          <Table>
            <thead>
              <tr><th>Status</th><th>Count</th></tr>
            </thead>
            <tbody>
              {Object.entries(data.statusBreakdown).map(([status, count]) => (
                <tr key={status}><td>{status}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `project-report-${data.projectName.replace(/\s+/g, "-")}.csv`,
                  Object.entries(data.statusBreakdown).map(([status, count]) => ({ project: data.projectName, status, count, estimatedHours: data.estimatedHours, actualHours: data.actualHours, progress: data.progress })),
                )
              }
            >
              Export CSV
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CompanyReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-company", start, end],
    queryFn: () => api.get<CompanyReport>(`/api/reports/company?start=${start}&end=${end}`),
  });

  return (
    <div>
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Active Projects" value={data.activeProjectCount} />
            <StatCard label="Total Tasks" value={data.totalTasks} />
            <StatCard label="Completion Rate" value={pct(data.completionRate)} />
            <StatCard label="Hours Logged" value={`${Math.round(data.totalHoursLogged)}h`} />
            <StatCard label="Capacity" value={`${Math.round(data.totalCapacityHours)}h`} />
            <StatCard label="Assigned" value={`${Math.round(data.totalAssignedHours)}h`} />
            <StatCard label="Utilization" value={data.utilization === null ? "-" : pct(data.utilization)} />
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv("company-report.csv", [
                { start: data.start, end: data.end, activeProjectCount: data.activeProjectCount, totalTasks: data.totalTasks, tasksCompleted: data.tasksCompleted, completionRate: data.completionRate, totalHoursLogged: data.totalHoursLogged, utilization: data.utilization },
              ])
            }
          >
            Export CSV
          </Button>
        </>
      )}
    </div>
  );
}
