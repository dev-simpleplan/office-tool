import type { FastifyInstance } from "fastify";
import { CreateDepartmentSchema, UpdateDepartmentSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

export async function departmentRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("departments.view") }, async (_req, reply) => {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    return reply.send({ departments });
  });

  app.post("/", { preHandler: app.requirePermission("departments.create") }, async (req, reply) => {
    const parsed = CreateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return reply.code(409).send({ error: "department_exists" });
    }
    const department = await prisma.department.create({ data: parsed.data });
    return reply.code(201).send({ department });
  });

  app.patch("/:id", { preHandler: app.requirePermission("departments.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const department = await prisma.department.update({ where: { id }, data: parsed.data });
    return reply.send({ department });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("departments.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const department = await prisma.department.update({ where: { id }, data: { status: "ARCHIVED" } });
    return reply.send({ department });
  });

  app.delete("/:id", { preHandler: app.requirePermission("departments.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.department.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.department.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
