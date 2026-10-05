export interface MonthlyUsageRow {
  /** "YYYY-MM" */
  month: string;
  usedHours: number;
  plannedHours: number;
}

interface UsageTask {
  status: string;
  dueDate: Date | null;
  estimatedHours: unknown;
  timeEntries: { hours: unknown; date: Date }[];
}

const round2 = (n: number) => Number(n.toFixed(2));

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return monthKey(new Date(Date.UTC(y, m - 1 + by, 1)));
}

/**
 * Per-month hours for a project, derived from its tasks.
 * - usedHours: time logged on the project's tasks, bucketed by the log date.
 * - plannedHours: estimated hours of tasks (not cancelled) bucketed by due date.
 * Covers the 6 months up to now through next month, widened back to the
 * earliest month with data (at most 24 months back).
 */
export function buildMonthlyUsage(tasks: UsageTask[], now: Date = new Date()): MonthlyUsageRow[] {
  const used = new Map<string, number>();
  const planned = new Map<string, number>();

  for (const t of tasks) {
    for (const e of t.timeEntries) {
      const k = monthKey(e.date);
      used.set(k, (used.get(k) ?? 0) + Number(e.hours));
    }
    if (t.dueDate && t.estimatedHours != null && t.status !== "CANCELLED") {
      const k = monthKey(t.dueDate);
      planned.set(k, (planned.get(k) ?? 0) + Number(t.estimatedHours));
    }
  }

  const nowKey = monthKey(now);
  const floor = shiftMonth(nowKey, -23);
  const dataKeys = [...used.keys(), ...planned.keys()].sort();
  let start = shiftMonth(nowKey, -5);
  if (dataKeys[0] && dataKeys[0] < start) start = dataKeys[0];
  if (start < floor) start = floor;
  const end = shiftMonth(nowKey, 1);

  const rows: MonthlyUsageRow[] = [];
  for (let k = start; k <= end; k = shiftMonth(k, 1)) {
    rows.push({ month: k, usedHours: round2(used.get(k) ?? 0), plannedHours: round2(planned.get(k) ?? 0) });
  }
  return rows;
}
