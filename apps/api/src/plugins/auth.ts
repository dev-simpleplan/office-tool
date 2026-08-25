import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getSessionUser } from "../lib/session.js";
import type { AuthUser } from "@office/shared";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }
  interface FastifyInstance {
    requirePermission: (permission: string) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("user", null);

  app.addHook("preHandler", async (req) => {
    const sessionId = req.cookies["op_session"];
    req.user = await getSessionUser(sessionId);
  });

  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401).send({ error: "unauthenticated" });
    }
  });

  app.decorate("requirePermission", (permission: string) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        reply.code(401).send({ error: "unauthenticated" });
        return;
      }
      if (!req.user.permissions.includes(permission)) {
        reply.code(403).send({ error: "forbidden", missing: permission });
      }
    };
  });
});
