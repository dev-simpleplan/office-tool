import { useQuery } from "@tanstack/react-query";
import { Badge } from "@office/ui";
import { api } from "../lib/api";
import type { TeamLeadDashboardData } from "@office/shared";

function utilizationVariant(u: number | null) {
  if (u === null) return "default" as const;
  if (u > 1) return "danger" as const;
  if (u < 0.5) return "warning" as const;
  return "success" as const;
}

export function TeamWorkloadPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<TeamLeadDashboardData>("/api/dashboard"),
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Team Workload</h1>
      <p className="mb-6 text-sm text-text-muted">{data?.teamName ?? "-"} · this week</p>
      {isLoading && <p className="text-text-muted">Loading...</p>}
      {data && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Assigned</th>
                <th className="p-3">Utilization</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.teamWorkload.map((w) => (
                <tr key={w.employeeId} className="border-t border-border">
                  <td className="p-3">{w.fullName}</td>
                  <td className="p-3">{w.hasSchedule ? `${Math.round(w.capacityHours ?? 0)}h` : "Unknown"}</td>
                  <td className="p-3">{Math.round(w.assignedHours)}h</td>
                  <td className="p-3">
                    {w.hasSchedule && w.utilization !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-background">
                          <div
                            className={`h-full ${w.utilization > 1 ? "bg-danger" : w.utilization < 0.5 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${Math.min(100, Math.round(w.utilization * 100))}%` }}
                          />
                        </div>
                        <span>{Math.round(w.utilization * 100)}%</span>
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {!w.hasSchedule ? (
                      <Badge>No schedule set</Badge>
                    ) : (
                      <Badge variant={utilizationVariant(w.utilization)}>
                        {w.utilization === null ? "-" : w.utilization > 1 ? "Overloaded" : w.utilization < 0.5 ? "Underutilized" : "On track"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {data.teamWorkload.length === 0 && (
                <tr><td className="p-3 text-text-muted" colSpan={5}>No team members.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
