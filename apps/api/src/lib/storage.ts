import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { env } from "./env.js";

/** Thin filesystem-backed storage abstraction. Callers deal only in opaque
 *  storage keys, never paths, so this can be swapped for S3/R2 later
 *  without touching route code (spec section 46). */
export const storage = {
  async put(key: string, data: Buffer): Promise<void> {
    const path = join(env.STORAGE_PATH, key);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, data);
  },
  async get(key: string): Promise<Buffer> {
    return readFile(join(env.STORAGE_PATH, key));
  },
  async remove(key: string): Promise<void> {
    await unlink(join(env.STORAGE_PATH, key)).catch(() => undefined);
  },
};
