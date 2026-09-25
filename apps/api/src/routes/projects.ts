import type { FastifyInstance } from "fastify";
import { CreateProjectSchema, UpdateProjectSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";
import { Prisma, ProjectStatus } from "../generated/prisma/index.js";

const projectInclude = {
  department: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  projectLead: { select: { id: true, fullName: true } },
  tasks: { select: { id: true, status: true } },
} satisfies Prisma.ProjectInclude;

type ProjectWithTasks = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function serializeProject(p: ProjectWithTasks) {
  const { tasks, budget, estimatedHours, ...rest } = p;
  return {
    ...rest,
    budget: budget === null || budget === undefined ? null : Number(budget),
    estimatedHours: estimatedHours === null || estimatedHours === undefined ? null : Number(estimatedHours),
    taskCount: tasks?.length ?? 0,
    completedTaskCount: tasks?.filter((t) => t.status === "COMPLETED").length ?? 0,
  };
}

export async function projectRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("projects.view") }, async (req, reply) => {
    const q = req.query as {
      status?: ProjectStatus;
      departmentId?: string;
      teamId?: string;
      page?: string;
      pageSize?: string;
    };
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.departmentId ? { departmentId: q.departmentId } : {}),
      ...(q.teamId ? { teamId: q.teamId } : {}),
    };
    const take = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);
    const currentPage = Math.max(Number(q.page) || 1, 1);
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.project.count({ where }),
    ]);
    return reply.send({ projects: projects.map(serializeProject), page: currentPage, pageSize: take, total });
  });

  const projectDetailInclude = {
    ...projectInclude,
    tasks: {
      include: {
        assignee: { select: { id: true, fullName: true } },
        project: { select: { id: true, name: true } },
        timeEntries: { select: { hours: true } },
      },
    },
  } satisfies Prisma.ProjectInclude;

  app.get("/:id", { preHandler: app.requirePermission("projects.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({ where: { id }, include: projectDetailInclude });
    if (!project) return reply.code(404).send({ error: "not_found" });
    const { tasks, ...base } = project;
    const serialized = serializeProject({ ...base, tasks });
    const taskList = tasks.map((t) => {
      const { timeEntries, estimatedHours, ...rest } = t;
      return {
        ...rest,
        estimatedHours: estimatedHours === null ? null : Number(estimatedHours),
        actualHours: timeEntries.reduce((sum, e) => sum + Number(e.hours), 0),
      };
    });
    return reply.send({ project: { ...serialized, tasks: taskList } });
  });

  app.post("/", { preHandler: app.requirePermission("projects.create") }, async (req, reply) => {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const { startDate, endDate, ...data } = parsed.data;
    const project = await prisma.project.create({
      data: {
        ...data,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        createdById: req.user!.id,
      },
      include: projectInclude,
    });
    return reply.code(201).send({ project: serializeProject(project) });
  });

  app.patch("/:id", { preHandler: app.requirePermission("projects.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const { startDate, endDate, ...data } = parsed.data;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
      include: projectInclude,
    });
    return reply.send({ project: serializeProject(project) });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("projects.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: projectInclude,
    });
    return reply.send({ project: serializeProject(project) });
  });

  app.delete("/:id", { preHandler: app.requirePermission("projects.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.project.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
