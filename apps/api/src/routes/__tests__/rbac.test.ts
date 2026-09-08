import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

function extractCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  return String(cookie).split(";")[0] ?? "";
}

// The single most common real bug across phases 1-6 per the spec: an
// EMPLOYEE seeing another employee's tasks/data. This asserts the boundary
// directly against the live API and dev DB.
describe("RBAC — EMPLOYEE data scoping", () => {
  let app: FastifyInstance;
  let employeeCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    const employeeLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "casey@simpleplan.media", password: "Password123!" },
    });
    employeeCookie = extractCookie(employeeLogin);

    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "admin1@simpleplan.media", password: "Password123!" },
    });
    adminCookie = extractCookie(adminLogin);
  });

  afterAll(async () => {
    await app.close();
  });

  it("EMPLOYEE only sees their own tasks, ADMIN sees all", async () => {
    const empRes = await app.inject({
      method: "GET",
      url: "/api/tasks",
      headers: { cookie: employeeCookie },
    });
    expect(empRes.statusCode).toBe(200);
    const empBody = empRes.json();

    const adminRes = await app.inject({
      method: "GET",
      url: "/api/tasks",
      headers: { cookie: adminCookie },
    });
    expect(adminRes.statusCode).toBe(200);
    const adminBody = adminRes.json();

    expect(adminBody.total).toBeGreaterThanOrEqual(empBody.total);
    for (const task of empBody.tasks) {
      if (task.assignee) {
        expect(task.assignee.id).not.toBe(undefined);
      }
    }
    // Every task returned to the employee must be assigned to them —
    // the actual boundary this test exists to catch a regression on.
    const employeeMeRes = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: employeeCookie },
    });
    const employeeId = employeeMeRes.json().user.employeeId;
    for (const task of empBody.tasks) {
      expect(task.assignee?.id).toBe(employeeId);
    }
  });

  it("unauthenticated requests are rejected", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tasks" });
    expect(res.statusCode).toBe(401);
  });
});
