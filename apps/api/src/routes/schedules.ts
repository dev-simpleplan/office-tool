import type { FastifyInstance } from "fastify";
import { CreateWorkScheduleSchema, UpdateWorkScheduleSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

export async function scheduleRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("schedules.view") }, async (_req, reply) => {
    const schedules = await prisma.workSchedule.findMany({
      orderBy: { name: "asc" },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
    });
    return reply.send({ schedules });
  });

  app.post("/", { preHandler: app.requirePermission("schedules.create") }, async (req, reply) => {
    const parsed = CreateWorkScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { name, days } = parsed.data;
    const schedule = await prisma.workSchedule.create({
      data: { name, days: { create: days } },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
    });
    return reply.code(201).send({ schedule });
  });

  app.patch("/:id", { preHandler: app.requirePermission("schedules.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateWorkScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { name, days } = parsed.data;
    const schedule = await prisma.workSchedule.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(days
          ? {
              days: {
                deleteMany: {},
                create: days,
              },
            }
          : {}),
      },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
    });
    return reply.send({ schedule });
  });
}
