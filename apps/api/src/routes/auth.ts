import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { LoginSchema, ChangePasswordSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";
import { createSession, destroySession } from "../lib/session.js";
import { env } from "../lib/env.js";

const COOKIE_NAME = "op_session";

// The web app and API can be deployed on entirely different sites (e.g. a
// Vercel domain talking to a VPS-hosted API), so SameSite=Lax — which
// browsers never attach on cross-site fetch/XHR regardless of method — would
// silently drop the session cookie on every request after login. SameSite=None
// is required for that topology, and browsers mandate Secure alongside it.
// NODE_ENV isn't a reliable production signal here (never set in the Docker
// container), so derive both from whether the API is actually served over
// HTTPS.
const IS_HTTPS_API = env.API_URL.startsWith("https://");

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
      sameSite: IS_HTTPS_API ? "none" : "lax",
      secure: IS_HTTPS_API,
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
    reply.clearCookie(COOKIE_NAME, {
      path: "/",
      sameSite: IS_HTTPS_API ? "none" : "lax",
      secure: IS_HTTPS_API,
    });
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
