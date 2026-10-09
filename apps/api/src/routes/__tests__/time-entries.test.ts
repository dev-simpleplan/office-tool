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
