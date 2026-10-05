import type { FastifyInstance } from "fastify";
import { CreateProjectTypeSchema, UpdateProjectTypeSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

export async function projectTypeRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("projects.view") }, async (_req, reply) => {
    const types = await prisma.projectType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    return reply.send({
      projectTypes: types.map(({ _count, ...t }) => ({ ...t, projectCount: _count.projects })),
    });
  });

  app.post("/", { preHandler: app.requirePermission("projects.create") }, async (req, reply) => {
    const parsed = CreateProjectTypeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const existing = await prisma.projectType.findUnique({ where: { name: parsed.data.name } });
    if (existing) return reply.code(409).send({ error: "project_type_exists" });
    const projectType = await prisma.projectType.create({ data: parsed.data });
    return reply.code(201).send({ projectType: { ...projectType, projectCount: 0 } });
  });

  app.patch("/:id", { preHandler: app.requirePermission("projects.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateProjectTypeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const current = await prisma.projectType.findUnique({ where: { id }, select: { id: true } });
    if (!current) return reply.code(404).send({ error: "not_found" });
    const clash = await prisma.projectType.findUnique({ where: { name: parsed.data.name } });
    if (clash && clash.id !== id) return reply.code(409).send({ error: "project_type_exists" });
    const projectType = await prisma.projectType.update({ where: { id }, data: parsed.data });
    return reply.send({ projectType });
  });

  app.delete("/:id", { preHandler: app.requirePermission("projects.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.projectType.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.projectType.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
