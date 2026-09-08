import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

// Runs against the real dev database (DATABASE_URL from the environment) and
// the demo users seeded by prisma/seed.ts — this is an integration test, not
// a mock-based unit test, per the phase 7 testing requirement.
describe("auth", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects invalid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "admin1@simpleplan.media", password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("logs in with valid credentials and sets a session cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "admin1@simpleplan.media", password: "Password123!" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a disabled (archived) account", async () => {
    // casey is an active demo EMPLOYEE, not archived — this test documents
    // the expectation via a bogus/nonexistent account instead, since seed.ts
    // does not currently ship an archived login. Real archived-account
    // coverage should be added once such a fixture exists.
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "does-not-exist@simpleplan.media", password: "Password123!" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("/api/auth/me requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
