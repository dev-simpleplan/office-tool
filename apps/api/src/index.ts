import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { employeeRoutes } from "./routes/employees.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [env.WEB_URL],
  credentials: true,
});
await app.register(cookie);
await app.register(authPlugin);

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(employeeRoutes, { prefix: "/api/employees" });

app.get("/health", async () => ({ status: "ok" }));

const port = env.PORT ? Number(env.PORT) : 4000;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`api listening on ${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
