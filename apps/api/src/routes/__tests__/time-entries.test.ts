import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

function extractCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  return String(cookie).split(";")[0] ?? "";
}

describe("time entries — formatted descriptions", () => {
  let app: FastifyInstance;
  let cookie: string;
  let taskId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    cookie = extractCookie(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "admin1@simpleplan.media", password: "Password123!" },
      })
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie },
      payload: { title: "ZZ rich text test task" },
    });
    taskId = res.json().task.id;
  });

  afterAll(async () => {
    await app.inject({ method: "DELETE", url: `/api/tasks/${taskId}`, headers: { cookie } });
    await app.close();
  });

  const log = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: `/api/tasks/${taskId}/time-entries`, headers: { cookie }, payload });

  it("stores formatted text and strips anything unsafe", async () => {
    const res = await log({
      date: "2026-10-09",
      hours: 2,
      description:
        '<h2>Done</h2><ul><li><p>fixed <strong>login</strong></p></li></ul><p onclick="x()">see <a href="javascript:alert(1)">this</a> <a href="https://ok.example">link</a></p><script>alert(1)</script>',
    });
    expect(res.statusCode).toBe(201);
    const description: string = res.json().entry.description;
    expect(description).toContain("<h2>Done</h2>");
    expect(description).toContain("<strong>login</strong>");
    expect(description).toContain('href="https://ok.example"');
    expect(description).not.toMatch(/script|onclick|javascript:/i);
  });

  it("accepts descriptions longer than the old 1000 character limit", async () => {
    const res = await log({ date: "2026-10-09", hours: 1, description: `<p>${"a".repeat(3000)}</p>` });
    expect(res.statusCode).toBe(201);
  });

  it("clears a description when edited to empty, and cleans edits", async () => {
    const created = await log({ date: "2026-10-09", hours: 1, description: "<p>first</p>" });
    const entryId = created.json().entry.id;
    const patch = (description: string) =>
      app.inject({
        method: "PATCH",
        url: `/api/tasks/${taskId}/time-entries/${entryId}`,
        headers: { cookie },
        payload: { description },
      });

    const edited = await patch('<p>second <img src=x onerror=alert(1)></p>');
    expect(edited.json().entry.description).toBe("<p>second </p>");

    const cleared = await patch("<p></p>");
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().entry.description).toBeNull();
  });
});

describe("time entries — who an entry is logged for", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let leadCookie: string;
  let managerCookie: string;
  let employeeCookie: string;
  let taskId: string;
  let assignedTaskId: string;
  let caseyId: string;
  let otherId: string;
  let pmEmployeeId: string;

  const login = async (email: string, password: string) =>
    extractCookie(await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } }));
  const call = (cookie: string, method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown) =>
    app.inject({ method, url, headers: { cookie }, payload: payload as Record<string, unknown> | undefined });

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    adminCookie = await login("admin1@simpleplan.media", "Password123!");
    leadCookie = await login("teamlead@simpleplan.media", "Password123!");
    employeeCookie = await login("casey@simpleplan.media", "Password123!");

    // A Project Manager login, created for this test and removed afterwards.
    const pm = await call(adminCookie, "POST", "/api/employees", {
      fullName: "ZZ Test PM",
      jobTitle: "PM",
      email: "zz-te-pm@example.com",
      hireDate: "2026-01-01",
      createLogin: true,
      password: "TempPass123!",
      role: "PROJECT_MANAGER",
    });
    pmEmployeeId = pm.json().employee.id;
    managerCookie = await login("zz-te-pm@example.com", "TempPass123!");

    caseyId = (await call(employeeCookie, "GET", "/api/auth/me")).json().user.employeeId;
    const list = (await call(adminCookie, "GET", "/api/employees?pageSize=200")).json().employees as { id: string }[];
    otherId = list.find((e) => e.id !== caseyId && e.id !== pmEmployeeId)!.id;

    taskId = (await call(adminCookie, "POST", "/api/tasks", { title: "ZZ logged-for task" })).json().task.id;
    assignedTaskId = (
      await call(adminCookie, "POST", "/api/tasks", { title: "ZZ casey task", assigneeId: caseyId })
    ).json().task.id;
  });

  afterAll(async () => {
    await call(adminCookie, "DELETE", `/api/tasks/${taskId}`);
    await call(adminCookie, "DELETE", `/api/tasks/${assignedTaskId}`);
    await call(adminCookie, "DELETE", `/api/employees/${pmEmployeeId}`);
    await app.close();
  });

  const entry = { date: "2026-10-09", hours: 1 };

  it("lets admins, team leads and project managers log time for someone else", async () => {
    for (const cookie of [adminCookie, leadCookie, managerCookie]) {
      const res = await call(cookie, "POST", `/api/tasks/${taskId}/time-entries`, { ...entry, employeeId: caseyId });
      expect(res.statusCode).toBe(201);
      expect(res.json().entry.employee.id).toBe(caseyId);
    }
  });

  it("rejects an employee id that does not exist", async () => {
    const res = await call(adminCookie, "POST", `/api/tasks/${taskId}/time-entries`, {
      ...entry,
      employeeId: "00000000-0000-4000-8000-000000000000",
    });
    expect(res.statusCode).toBe(400);
  });

  it("does not let an employee log time on a task that isn't theirs", async () => {
    const res = await call(employeeCookie, "POST", `/api/tasks/${taskId}/time-entries`, entry);
    expect(res.statusCode).toBe(403);
  });

  it("always records an employee's own time under themselves, whatever they send", async () => {
    const res = await call(employeeCookie, "POST", `/api/tasks/${assignedTaskId}/time-entries`, {
      ...entry,
      employeeId: otherId,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().entry.employee.id).toBe(caseyId);
  });

  it("lets a manager move an entry to someone else, but not an employee", async () => {
    const own = (
      await call(employeeCookie, "POST", `/api/tasks/${assignedTaskId}/time-entries`, entry)
    ).json().entry.id as string;
    const url = `/api/tasks/${assignedTaskId}/time-entries/${own}`;

    expect((await call(employeeCookie, "PATCH", url, { employeeId: otherId })).statusCode).toBe(403);
    expect((await call(employeeCookie, "PATCH", url, { hours: 2 })).statusCode).toBe(200);

    const moved = await call(adminCookie, "PATCH", url, { employeeId: otherId });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().entry.employee.id).toBe(otherId);

    const bad = await call(adminCookie, "PATCH", url, { employeeId: "00000000-0000-4000-8000-000000000000" });
    expect(bad.statusCode).toBe(400);
  });

  it("does not let an employee edit someone else's entry", async () => {
    const theirs = (
      await call(adminCookie, "POST", `/api/tasks/${assignedTaskId}/time-entries`, { ...entry, employeeId: otherId })
    ).json().entry.id as string;
    const res = await call(employeeCookie, "PATCH", `/api/tasks/${assignedTaskId}/time-entries/${theirs}`, { hours: 5 });
    expect(res.statusCode).toBe(403);
  });
});
