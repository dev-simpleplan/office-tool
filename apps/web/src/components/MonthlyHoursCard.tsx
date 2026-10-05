import { useState } from "react";
import { Button, ProgressBar, Table } from "@office/ui";
import type { MonthlyUsage } from "@office/shared";

const hours = (n: number) => `${Number(n.toFixed(2))}h`;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyHoursCard({ allocated, usage }: { allocated: number; usage: MonthlyUsage[] }) {
  const months = usage.map((u) => u.month);
  const initial = months.includes(currentMonthKey()) ? currentMonthKey() : months[months.length - 1];
  const [selected, setSelected] = useState(initial);

  const index = months.indexOf(selected ?? "");
  const row = usage[index];
  if (!row) return null;

  const left = allocated - row.usedHours;
  const over = left < 0;
  const percentUsed = allocated > 0 ? (row.usedHours / allocated) * 100 : row.usedHours > 0 ? 100 : 0;

  return (
    <section className="mb-8 rounded-lg border border-border bg-surface p-6" aria-label="Monthly hours">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Monthly Hours</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Previous month"
            disabled={index <= 0}
            onClick={() => setSelected(months[index - 1]!)}
          >
            &lsaquo;
          </Button>
          <span className="min-w-[6.5rem] text-center text-sm font-semibold">{monthLabel(row.month)}</span>
          <Button
            variant="secondary"
            aria-label="Next month"
            disabled={index >= months.length - 1}
            onClick={() => setSelected(months[index + 1]!)}
          >
            &rsaquo;
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-3xl font-bold ${over ? "text-danger" : ""}`}>
          {over ? `Over by ${hours(-left)}` : `${hours(left)} left`}
        </span>
        <span className="text-text-muted">of {hours(allocated)} allocated</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={percentUsed} tone={over ? "danger" : "default"} />
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        {hours(row.usedHours)} used ({Math.round(percentUsed)}%)
        {row.plannedHours > 0 && (
          <span className="text-text-muted"> · {hours(row.plannedHours)} planned on tasks due this month</span>
        )}
      </p>

      <div className="mt-5 max-h-64 overflow-y-auto">
        <Table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Used</th>
              <th>Allocated</th>
              <th>Left</th>
            </tr>
          </thead>
          <tbody>
            {[...usage].reverse().map((u) => {
              const rowLeft = allocated - u.usedHours;
              return (
                <tr
                  key={u.month}
                  onClick={() => setSelected(u.month)}
                  className={`cursor-pointer hover:bg-surface-hover ${u.month === selected ? "bg-surface-hover" : ""}`}
                  aria-selected={u.month === selected}
                >
                  <td className={u.month === selected ? "font-semibold" : ""}>{monthLabel(u.month)}</td>
                  <td>{hours(u.usedHours)}</td>
                  <td>{hours(allocated)}</td>
                  <td className={rowLeft < 0 ? "text-danger" : ""}>
                    {rowLeft < 0 ? `-${hours(-rowLeft)}` : hours(rowLeft)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Used hours come from time logged on this project&rsquo;s tasks, counted in the month each entry is dated. Past
        months are compared against the current allocation.
      </p>
    </section>
  );
}
