import { prisma } from "./prisma.js";

function timeToHours(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

/**
 * Capacity = sum of working hours per day (from WorkScheduleDay rows) across
 * every calendar day in [start, end]. Assigned = sum of estimatedHours for
 * tasks assigned to the employee whose dueDate falls in [start, end] — we use
 * dueDate (not startDate-dueDate span) because that's the single date every
 * task already has consistently, and it keeps "what's due this week" and
 * "what's the workload this week" the same underlying query.
 */
export async function computeWorkload(employeeId: string, start: Date, end: Date) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { schedule: { include: { days: true } } },
  });
  if (!employee) return null;

  let capacityHours: number | null = null;
  if (employee.schedule) {
    capacityHours = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const day = employee.schedule.days.find((d) => d.dayOfWeek === cursor.getDay());
      if (day?.isWorkingDay && day.startTime && day.endTime) {
        const hours = timeToHours(day.endTime) - timeToHours(day.startTime) - day.breakMinutes / 60;
        capacityHours += Math.max(0, hours);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const tasks = await prisma.task.findMany({
    where: { assigneeId: employeeId, dueDate: { gte: start, lte: end } },
    select: { estimatedHours: true },
  });
  const assignedHours = tasks.reduce((sum, t) => sum + Number(t.estimatedHours ?? 0), 0);

  return {
    employeeId,
    capacityHours,
    assignedHours,
    utilization: capacityHours && capacityHours > 0 ? assignedHours / capacityHours : null,
    hasSchedule: !!employee.schedule,
  };
}

function nextOccurrence(date: Date, from: Date): Date {
  const next = new Date(from.getFullYear(), date.getMonth(), date.getDate());
  if (next < from) next.setFullYear(from.getFullYear() + 1);
  return next;
}

export function upcomingWithinDays(dates: { employeeId: string; fullName: string; date: Date }[], withinDays = 30, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);
  return dates
    .map((d) => ({ ...d, nextOccurrence: nextOccurrence(d.date, today) }))
    .filter((d) => d.nextOccurrence <= cutoff)
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime())
    .map((d) => ({
      employeeId: d.employeeId,
      fullName: d.fullName,
      date: d.date.toISOString(),
      nextOccurrence: d.nextOccurrence.toISOString(),
    }));
}

export function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday-start week
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
