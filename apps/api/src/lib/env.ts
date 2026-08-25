import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  API_URL: z.string().min(1),
  WEB_URL: z.string().min(1),
  STORAGE_PATH: z.string().default("./storage"),
  PORT: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
