import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

interface SearchResult {
  id: string;
  type: "employee" | "project" | "task" | "team" | "department";
  title: string;
  subtitle: string;
}

const LIMIT = 5;

export async function searchRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requireAuth }, async (req, reply) => {
    const { q } = req.query as { q?: string };
    const user = req.user!;
    const query = (q ?? "").trim();
    if (query.length < 1) {
      return reply.send({ results: [] });
    }
    const results: SearchResult[] = [];
    const contains = { contains: query, mode: "insensitive" as const };

    if (user.permissions.includes("employees.view")) {
      const employees = await prisma.employee.findMany({
        where: { fullName: contains },
        take: LIMIT,
        select: { id: true, fullName: true, jobTitle: true },
      });
      results.push(
        ...employees.map((e) => ({ id: e.id, type: "employee" as const, title: e.fullName, subtitle: e.jobTitle }))
      );
    }

    if (user.permissions.includes("projects.view")) {
      const projects = await prisma.project.findMany({
        where: { name: contains },
        take: LIMIT,
        select: { id: true, name: true, client: true },
      });
      results.push(
        ...projects.map((p) => ({ id: p.id, type: "project" as const, title: p.name, subtitle: p.client ?? "Project" }))
      );
    }

    if (user.permissions.includes("tasks.view")) {
      // Mirror the exact EMPLOYEE-scoping rule from GET /api/tasks (tasks.ts).
      const isScopedToOwnTasks = user.roleName === "EMPLOYEE";
      const tasks = await prisma.task.findMany({
        where: {
          title: contains,
          ...(isScopedToOwnTasks ? { assigneeId: user.employeeId ?? "__none__" } : {}),
        },
        take: LIMIT,
        select: { id: true, title: true, status: true },
      });
      results.push(
        ...tasks.map((t) => ({ id: t.id, type: "task" as const, title: t.title, subtitle: t.status }))
      );
    }

    if (user.permissions.includes("teams.view")) {
      const teams = await prisma.team.findMany({
        where: { name: contains },
        take: LIMIT,
        select: { id: true, name: true },
      });
      results.push(...teams.map((t) => ({ id: t.id, type: "team" as const, title: t.name, subtitle: "Team" })));
    }

    if (user.permissions.includes("departments.view")) {
      const departments = await prisma.department.findMany({
        where: { name: contains },
        take: LIMIT,
        select: { id: true, name: true },
      });
      results.push(
        ...departments.map((d) => ({ id: d.id, type: "department" as const, title: d.name, subtitle: "Department" }))
      );
    }

    return reply.send({ results });
  });
}
