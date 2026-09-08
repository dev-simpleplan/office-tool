import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { env } from "./lib/env.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { employeeRoutes } from "./routes/employees.js";
import { departmentRoutes } from "./routes/departments.js";
import { teamRoutes } from "./routes/teams.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { projectRoutes } from "./routes/projects.js";
import { taskRoutes } from "./routes/tasks.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { reportRoutes } from "./routes/reports.js";
import { notificationRoutes } from "./routes/notifications.js";
import { searchRoutes } from "./routes/search.js";

/** Builds (but doesn't start listening) the Fastify app — split out from
 *  index.ts so integration tests can exercise real routes/plugins via
 *  `app.inject()` without binding a port. */
export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? true });

  // CSRF: the session cookie is set with SameSite=Lax, so browsers withhold it on
  // cross-site subresource/XHR requests initiated by third-party pages (only
  // top-level nav GETs carry it). Combined with the CORS allowlist below (only
  // WEB_URL may read responses via fetch with credentials), a third-party site
  // cannot both send the cookie and read the response, so no CSRF token is needed.
  await app.register(cors, {
    origin: [env.WEB_URL],
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(employeeRoutes, { prefix: "/api/employees" });
  await app.register(departmentRoutes, { prefix: "/api/departments" });
  await app.register(teamRoutes, { prefix: "/api/teams" });
  await app.register(scheduleRoutes, { prefix: "/api/schedules" });
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(reportRoutes, { prefix: "/api/reports" });
  await app.register(notificationRoutes, { prefix: "/api/notifications" });
  await app.register(searchRoutes, { prefix: "/api/search" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
