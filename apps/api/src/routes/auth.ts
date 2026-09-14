import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { LoginSchema, ChangePasswordSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";
import { createSession, destroySession } from "../lib/session.js";

const COOKIE_NAME = "op_session";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });
    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    if (user.employee?.status === "ARCHIVED") {
      return reply.code(403).send({ error: "account_disabled" });
    }

    const session = await createSession(user.id);
    reply.setCookie(COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });
    return reply.send({ ok: true });
    },
  );

  app.post("/logout", async (req, reply) => {
    const sessionId = req.cookies[COOKIE_NAME];
    if (sessionId) {
      await destroySession(sessionId);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: app.requireAuth }, async (req, reply) => {
    return reply.send({ user: req.user });
  });

  app.post("/change-password", { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const valid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return reply.code(401).send({ error: "invalid_current_password" });
    }
    const passwordHash = await argon2.hash(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return reply.send({ ok: true });
  });
}
