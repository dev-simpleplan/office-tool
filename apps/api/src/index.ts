import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const app = await buildApp({ logger: true });

const port = env.PORT ? Number(env.PORT) : 4000;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`api listening on ${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
