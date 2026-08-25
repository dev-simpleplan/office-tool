import { randomUUID } from "node:crypto";
import type { RoleName } from "@office/shared";
import { prisma } from "./prisma.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      id: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return session;
}

export async function getSessionUser(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const permissions = session.user.role.permissions.map((rp) => rp.permission.key);
  return {
    id: session.user.id,
    email: session.user.email,
    roleName: session.user.role.name as RoleName,
    permissions,
  };
}

export async function destroySession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
