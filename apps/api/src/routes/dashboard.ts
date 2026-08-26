import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { computeWorkload, upcomingWithinDays, startOfWeek, endOfWeek } from "../lib/workload.js";

const taskItemSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  project: { select: { id: true, name: true } },
} as const;

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = req.user!;
    const now = new Date();
    const { start: todayStart, end: todayEnd } = todayRange();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    if (user.roleName === "ADMIN") {
      const [employeeCount, activeEmployeeCount, departmentCount, teamCount, activeProjectCount, taskCount, completedTaskCount, overdueTaskCount, employees] =
        await Promise.all([
          prisma.employee.count(),
          prisma.employee.count({ where: { status: "ACTIVE" } }),
          prisma.department.count({ where: { status: "ACTIVE" } }),
          prisma.team.count({ where: { status: "ACTIVE" } }),
          prisma.project.count({ where: { status: "ACTIVE" } }),
          prisma.task.count(),
          prisma.task.count({ where: { status: "COMPLETED" } }),
          prisma.task.count({ where: { dueDate: { lt: todayStart }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
          prisma.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true, fullName: true, hireDate: true, dateOfBirth: true } }),
        ]);

      const upcomingBirthdays = upcomingWithinDays(
        employees.filter((e) => e.dateOfBirth).map((e) => ({ employeeId: e.id, fullName: e.fullName, date: e.dateOfBirth! })),
      );
      const upcomingAnniversaries = upcomingWithinDays(
        employees.map((e) => ({ employeeId: e.id, fullName: e.fullName, date: e.hireDate })),
      );

      const workloads = await Promise.all(employees.map((e) => computeWorkload(e.id, weekStart, weekEnd)));
      const companyWorkload = workloads.reduce(
        (acc, w) => {
          if (!w) return acc;
          if (w.hasSchedule) {
            acc.totalCapacity += w.capacityHours ?? 0;
            acc.employeesWithSchedule += 1;
          } else {
            acc.employeesWithoutSchedule += 1;
          }
          acc.totalAssigned += w.assignedHours;
          return acc;
        },
        { totalCapacity: 0, totalAssigned: 0, employeesWithSchedule: 0, employeesWithoutSchedule: 0 },
      );

      return reply.send({
        role: "ADMIN",
        employeeCount,
        activeEmployeeCount,
        departmentCount,
        teamCount,
        activeProjectCount,
        taskCount,
        completionRate: taskCount > 0 ? completedTaskCount / taskCount : 0,
        overdueTaskCount,
        upcomingBirthdays,
        upcomingAnniversaries,
        companyWorkload,
      });
    }

    if (user.roleName === "TEAM_LEAD") {
      const team = user.employeeId
        ? await prisma.team.findFirst({ where: { teamLeadId: user.employeeId, status: "ACTIVE" } })
        : null;
      const members = team ? await prisma.employee.findMany({ where: { teamId: team.id, status: "ACTIVE" } }) : [];
      const memberIds = members.map((m) => m.id);

      const [todaysTasks, overdueTasks, blockedTasks, teamProjects, weekEntries] = await Promise.all([
        prisma.task.findMany({ where: { assigneeId: { in: memberIds }, dueDate: { gte: todayStart, lte: todayEnd } }, select: taskItemSelect }),
        prisma.task.findMany({ where: { assigneeId: { in: memberIds }, dueDate: { lt: todayStart }, status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: taskItemSelect }),
        prisma.task.findMany({ where: { assigneeId: { in: memberIds }, status: "BLOCKED" }, select: taskItemSelect }),
        team ? prisma.project.findMany({ where: { teamId: team.id }, select: { id: true, name: true, status: true } }) : Promise.resolve([]),
        prisma.timeEntry.findMany({ where: { employeeId: { in: memberIds }, date: { gte: weekStart, lte: weekEnd } }, select: { hours: true } }),
      ]);

      const teamWorkload = await Promise.all(
        members.map(async (m) => {
          const w = await computeWorkload(m.id, weekStart, weekEnd);
          return { ...(w ?? { employeeId: m.id, capacityHours: null, assignedHours: 0, utilization: null, hasSchedule: false }), fullName: m.fullName };
        }),
      );

      return reply.send({
        role: "TEAM_LEAD",
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        memberCount: members.length,
        todaysTasks,
        overdueTasks,
        blockedTasks,
        teamProjects,
        teamHoursThisWeek: weekEntries.reduce((s, e) => s + Number(e.hours), 0),
        teamWorkload,
      });
    }

    // EMPLOYEE
    const employeeId = user.employeeId ?? "__none__";
    const [todaysTasks, overdueTasks, completedTaskCount, weekEntries, weeklyTasks, upcomingDeadlines] = await Promise.all([
      prisma.task.findMany({ where: { assigneeId: employeeId, dueDate: { gte: todayStart, lte: todayEnd } }, select: taskItemSelect }),
      prisma.task.findMany({ where: { assigneeId: employeeId, dueDate: { lt: todayStart }, status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: taskItemSelect }),
      prisma.task.count({ where: { assigneeId: employeeId, status: "COMPLETED" } }),
      prisma.timeEntry.findMany({ where: { employeeId, date: { gte: weekStart, lte: weekEnd } }, select: { hours: true } }),
      prisma.task.findMany({ where: { assigneeId: employeeId, dueDate: { gte: weekStart, lte: weekEnd } }, select: { status: true } }),
      prisma.task.findMany({
        where: { assigneeId: employeeId, dueDate: { gte: todayStart }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: taskItemSelect,
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    return reply.send({
      role: "EMPLOYEE",
      todaysTasks,
      overdueTasks,
      completedTaskCount,
      hoursLoggedThisWeek: weekEntries.reduce((s, e) => s + Number(e.hours), 0),
      weeklyProgress: { completed: weeklyTasks.filter((t) => t.status === "COMPLETED").length, total: weeklyTasks.length },
      upcomingDeadlines,
    });
  });

  app.get("/workload/:employeeId", { preHandler: app.requireAuth }, async (req, reply) => {
    const { employeeId } = req.params as { employeeId: string };
    const q = req.query as { start?: string; end?: string };
    const user = req.user!;

    if (user.roleName === "EMPLOYEE" && employeeId !== user.employeeId) {
      return reply.code(403).send({ error: "forbidden", reason: "not_your_workload" });
    }
    if (user.roleName === "TEAM_LEAD") {
      const team = user.employeeId ? await prisma.team.findFirst({ where: { teamLeadId: user.employeeId } }) : null;
      const target = await prisma.employee.findUnique({ where: { id: employeeId }, select: { teamId: true } });
      if (employeeId !== user.employeeId && (!team || target?.teamId !== team.id)) {
        return reply.code(403).send({ error: "forbidden", reason: "not_your_team" });
      }
    }

    const now = new Date();
    const start = q.start ? new Date(q.start) : startOfWeek(now);
    const end = q.end ? new Date(q.end) : endOfWeek(now);
    const result = await computeWorkload(employeeId, start, end);
    if (!result) return reply.code(404).send({ error: "not_found" });
    return reply.send({ workload: result });
  });

  app.get("/calendar", { preHandler: app.requireAuth }, async (req, reply) => {
    const user = req.user!;
    const q = req.query as { start?: string; end?: string };
    const now = new Date();
    const start = q.start ? new Date(q.start) : startOfWeek(now);
    const end = q.end ? new Date(q.end) : endOfWeek(now);

    const isEmployee = user.roleName === "EMPLOYEE";
    let teamMemberIds: string[] | null = null;
    if (user.roleName === "TEAM_LEAD") {
      const team = user.employeeId ? await prisma.team.findFirst({ where: { teamLeadId: user.employeeId } }) : null;
      teamMemberIds = team ? (await prisma.employee.findMany({ where: { teamId: team.id }, select: { id: true } })).map((e) => e.id) : [];
    }

    const taskWhere = isEmployee
      ? { assigneeId: user.employeeId ?? "__none__" }
      : teamMemberIds
        ? { assigneeId: { in: teamMemberIds } }
        : {};

    const tasks = await prisma.task.findMany({
      where: { ...taskWhere, dueDate: { gte: start, lte: end } },
      select: { id: true, title: true, dueDate: true, status: true },
    });

    const events: { id: string; type: string; title: string; date: string; status?: string; refId: string }[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      type: "TASK_DUE",
      title: t.title,
      date: t.dueDate!.toISOString(),
      status: t.status,
      refId: t.id,
    }));

    if (!isEmployee) {
      const projectWhere = teamMemberIds
        ? { teamId: (await prisma.team.findFirst({ where: { teamLeadId: user.employeeId ?? "__none__" } }))?.id ?? "__none__" }
        : {};
      const projects = await prisma.project.findMany({
        where: {
          ...projectWhere,
          OR: [{ startDate: { gte: start, lte: end } }, { endDate: { gte: start, lte: end } }],
        },
        select: { id: true, name: true, startDate: true, endDate: true, status: true },
      });
      for (const p of projects) {
        if (p.startDate && p.startDate >= start && p.startDate <= end) {
          events.push({ id: `proj-start-${p.id}`, type: "PROJECT_START", title: `${p.name} (start)`, date: p.startDate.toISOString(), status: p.status, refId: p.id });
        }
        if (p.endDate && p.endDate >= start && p.endDate <= end) {
          events.push({ id: `proj-end-${p.id}`, type: "PROJECT_END", title: `${p.name} (end)`, date: p.endDate.toISOString(), status: p.status, refId: p.id });
        }
      }
    }

    return reply.send({ events });
  });
}
