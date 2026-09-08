import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

function extractCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  return String(cookie).split(";")[0] ?? "";
}

describe("tasks — creation, assignment, status transitions", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let employeeId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    adminCookie = extractCookie(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "admin1@simpleplan.media", password: "Password123!" },
      })
    );

    const employeesRes = await app.inject({
      method: "GET",
      url: "/api/employees?pageSize=1",
      headers: { cookie: adminCookie },
    });
    employeeId = employeesRes.json().employees[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a task and assigns it, then transitions its status", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie: adminCookie },
      payload: {
        title: "Vitest integration task",
        assigneeId: employeeId,
        priority: "MEDIUM",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json().task;
    expect(created.assignee.id).toBe(employeeId);
    expect(created.status).toBe("NOT_STARTED");

    const updateRes = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${created.id}`,
      headers: { cookie: adminCookie },
      payload: { status: "IN_PROGRESS" },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().task.status).toBe("IN_PROGRESS");

    const completeRes = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${created.id}`,
      headers: { cookie: adminCookie },
      payload: { status: "COMPLETED" },
    });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.json().task.status).toBe("COMPLETED");
  });

  it("rejects task creation without tasks.create permission", async () => {
    const employeeCookie = extractCookie(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "casey@simpleplan.media", password: "Password123!" },
      })
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie: employeeCookie },
      payload: { title: "Should be forbidden" },
    });
    expect(res.statusCode).toBe(403);
  });
});
