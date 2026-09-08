import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requireAuth }, async (req, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return reply.send({ notifications });
  });

  app.post("/:id/read", { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user!.id) {
      return reply.code(404).send({ error: "not_found" });
    }
    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return reply.send({ notification: updated });
  });

  app.post("/read-all", { preHandler: app.requireAuth }, async (req, reply) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return reply.send({ ok: true });
  });
}
