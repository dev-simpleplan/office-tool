import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

function extractCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  return String(cookie).split(";")[0] ?? "";
}

describe("employees — salary visibility gating", () => {
  let app: FastifyInstance;
  let employeeCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();

    employeeCookie = extractCookie(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "casey@simpleplan.media", password: "Password123!" },
      })
    );
    adminCookie = extractCookie(
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "admin1@simpleplan.media", password: "Password123!" },
      })
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("paginates the employee list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/employees?page=1&pageSize=1",
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.employees.length).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(1);
    expect(typeof body.total).toBe("number");
  });

  it("ADMIN (salary.view) sees salary field populated, EMPLOYEE without it does not", async () => {
    const adminRes = await app.inject({
      method: "GET",
      url: "/api/employees?pageSize=5",
      headers: { cookie: adminCookie },
    });
    const adminBody = adminRes.json();
    expect(adminBody.employees.some((e: { salary?: unknown }) => e.salary !== undefined)).toBe(true);

    const empRes = await app.inject({
      method: "GET",
      url: "/api/employees?pageSize=5",
      headers: { cookie: employeeCookie },
    });
    const empBody = empRes.json();
    for (const e of empBody.employees) {
      expect(e.salary).toBeUndefined();
    }
  });
});
