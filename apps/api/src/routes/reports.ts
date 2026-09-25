import type { FastifyInstance } from "fastify";
import { isLeadRole } from "@office/shared";
import { prisma } from "../lib/prisma.js";
import { computeWorkload, startOfWeek, endOfWeek } from "../lib/workload.js";

function parseRange(q: { start?: string; end?: string }) {
  const now = new Date();
  const start = q.start ? new Date(q.start) : startOfWeek(now);
  const end = q.end ? new Date(q.end) : endOfWeek(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Estimated-vs-actual hours source decision: estimatedHours comes from tasks
 * whose dueDate falls in the range (same convention as computeWorkload's
 * "assigned" hours), while actualHours comes from time_entries whose date
 * falls in the range. These are two different populations (a task can be
 * worked on across many days, and hours can be logged against a task whose
 * due date is outside the window) but this mirrors the existing workload
 * engine's date convention and keeps the report's numbers consistent with
 * the rest of the app rather than inventing new date math.
 */
async function employeeHoursAndTasks(employeeId: string, start: Date, end: Date) {
  const [tasksDue, timeEntries] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: employeeId, dueDate: { gte: start, lte: end } },
      select: { status: true, estimatedHours: true },
    }),
    prisma.timeEntry.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      select: { hours: true },
    }),
  ]);
  const tasksCompleted = tasksDue.filter((t) => t.status === "COMPLETED").length;
  const estimatedHours = tasksDue.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0);
  const hoursLogged = timeEntries.reduce((s, e) => s + Number(e.hours), 0);
  return {
    totalTasks: tasksDue.length,
    tasksCompleted,
    completionRate: tasksDue.length > 0 ? tasksCompleted / tasksDue.length : 0,
    estimatedHours,
    actualHours: hoursLogged,
    hoursLogged,
  };
}

export async function reportRoutes(app: FastifyInstance) {
  app.get("/employee/:employeeId", { preHandler: app.requirePermission("reports.view") }, async (req, reply) => {
    const { employeeId } = req.params as { employeeId: string };
    const user = req.user!;

    if (user.roleName === "EMPLOYEE" && employeeId !== user.employeeId) {
      return reply.code(403).send({ error: "forbidden", reason: "not_your_report" });
    }
    if (isLeadRole(user.roleName)) {
      const team = user.employeeId ? await prisma.team.findFirst({ where: { teamLeadId: user.employeeId } }) : null;
      const target = await prisma.employee.findUnique({ where: { id: employeeId }, select: { teamId: true } });
      if (employeeId !== user.employeeId && (!team || target?.teamId !== team.id)) {
        return reply.code(403).send({ error: "forbidden", reason: "not_your_team" });
      }
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true } });
    if (!employee) return reply.code(404).send({ error: "not_found" });

    const { start, end } = parseRange(req.query as { start?: string; end?: string });
    const stats = await employeeHoursAndTasks(employeeId, start, end);

    return reply.send({
      employeeId: employee.id,
      fullName: employee.fullName,
      start: start.toISOString(),
      end: end.toISOString(),
      ...stats,
    });
  });

  app.get("/team/:teamId", { preHandler: app.requirePermission("reports.view") }, async (req, reply) => {
    const { teamId } = req.params as { teamId: string };
    const user = req.user!;

    if (user.roleName === "EMPLOYEE") {
      return reply.code(403).send({ error: "forbidden", reason: "employees_have_no_team_report" });
    }
    if (isLeadRole(user.roleName)) {
      const team = user.employeeId ? await prisma.team.findFirst({ where: { teamLeadId: user.employeeId } }) : null;
      if (!team || team.id !== teamId) {
        return reply.code(403).send({ error: "forbidden", reason: "not_your_team" });
      }
    }

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
    if (!team) return reply.code(404).send({ error: "not_found" });

    const { start, end } = parseRange(req.query as { start?: string; end?: string });
    const members = await prisma.employee.findMany({ where: { teamId }, select: { id: true, fullName: true } });
    const memberIds = members.map((m) => m.id);

    const [workloads, tasks] = await Promise.all([
      Promise.all(members.map(async (m) => ({ ...(await computeWorkload(m.id, start, end))!, fullName: m.fullName }))),
      prisma.task.findMany({
        where: { assigneeId: { in: memberIds }, dueDate: { gte: start, lte: end } },
        select: { status: true },
      }),
    ]);

    const totalCapacityHours = workloads.reduce((s, w) => s + (w.hasSchedule ? w.capacityHours ?? 0 : 0), 0);
    const totalAssignedHours = workloads.reduce((s, w) => s + w.assignedHours, 0);
    const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;

    return reply.send({
      teamId: team.id,
      teamName: team.name,
      start: start.toISOString(),
      end: end.toISOString(),
      memberCount: members.length,
      totalCapacityHours,
      totalAssignedHours,
      utilization: totalCapacityHours > 0 ? totalAssignedHours / totalCapacityHours : null,
      tasksCompleted,
      totalTasks: tasks.length,
      completionRate: tasks.length > 0 ? tasksCompleted / tasks.length : 0,
      members: workloads.map((w) => ({
        employeeId: w.employeeId,
        fullName: w.fullName,
        capacityHours: w.capacityHours,
        assignedHours: w.assignedHours,
        utilization: w.utilization,
        hasSchedule: w.hasSchedule,
      })),
    });
  });

  app.get("/project/:projectId", { preHandler: app.requirePermission("projects.view") }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
    if (!project) return reply.code(404).send({ error: "not_found" });

    const { start, end } = parseRange(req.query as { start?: string; end?: string });
    const tasks = await prisma.task.findMany({
      where: { projectId, dueDate: { gte: start, lte: end } },
      select: { status: true, estimatedHours: true, timeEntries: { select: { hours: true } } },
    });

    const estimatedHours = tasks.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0);
    const actualHours = tasks.reduce((s, t) => s + t.timeEntries.reduce((sum, e) => sum + Number(e.hours), 0), 0);
    const statusBreakdown: Record<string, number> = {};
    for (const t of tasks) {
      statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
    }
    const completed = statusBreakdown.COMPLETED ?? 0;

    return reply.send({
      projectId: project.id,
      projectName: project.name,
      start: start.toISOString(),
      end: end.toISOString(),
      estimatedHours,
      actualHours,
      progress: tasks.length > 0 ? completed / tasks.length : 0,
      totalTasks: tasks.length,
      statusBreakdown,
    });
  });

  app.get("/company", { preHandler: app.requirePermission("reports.view") }, async (req, reply) => {
    const user = req.user!;
    if (user.roleName !== "ADMIN") {
      return reply.code(403).send({ error: "forbidden", reason: "admin_only" });
    }

    const { start, end } = parseRange(req.query as { start?: string; end?: string });
    const [activeProjectCount, tasks, timeEntries, employees] = await Promise.all([
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.findMany({ where: { dueDate: { gte: start, lte: end } }, select: { status: true } }),
      prisma.timeEntry.findMany({ where: { date: { gte: start, lte: end } }, select: { hours: true } }),
      prisma.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true } }),
    ]);

    const workloads = await Promise.all(employees.map((e) => computeWorkload(e.id, start, end)));
    const totalCapacityHours = workloads.reduce((s, w) => s + (w?.hasSchedule ? w.capacityHours ?? 0 : 0), 0);
    const totalAssignedHours = workloads.reduce((s, w) => s + (w?.assignedHours ?? 0), 0);
    const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;

    return reply.send({
      start: start.toISOString(),
      end: end.toISOString(),
      activeProjectCount,
      totalTasks: tasks.length,
      tasksCompleted,
      completionRate: tasks.length > 0 ? tasksCompleted / tasks.length : 0,
      totalHoursLogged: timeEntries.reduce((s, e) => s + Number(e.hours), 0),
      totalCapacityHours,
      totalAssignedHours,
      utilization: totalCapacityHours > 0 ? totalAssignedHours / totalCapacityHours : null,
    });
  });
}
