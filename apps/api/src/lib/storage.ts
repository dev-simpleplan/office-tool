import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { env } from "./env.js";

const ROOT = resolve(env.STORAGE_PATH);

/** Defense in depth against a key that smuggles ".." segments (e.g. via an
 *  unsanitized filename upstream) and resolves outside the storage root. */
function resolveKey(key: string): string {
  const path = resolve(ROOT, key);
  if (path !== ROOT && !path.startsWith(ROOT + sep)) {
    throw new Error(`storage key escapes root: ${key}`);
  }
  return path;
}

/** Thin filesystem-backed storage abstraction. Callers deal only in opaque
 *  storage keys, never paths, so this can be swapped for S3/R2 later
 *  without touching route code (spec section 46). */
export const storage = {
  async put(key: string, data: Buffer): Promise<void> {
    const path = resolveKey(key);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, data);
  },
  async get(key: string): Promise<Buffer> {
    return readFile(resolveKey(key));
  },
  async remove(key: string): Promise<void> {
    await unlink(resolveKey(key)).catch(() => undefined);
  },
};
