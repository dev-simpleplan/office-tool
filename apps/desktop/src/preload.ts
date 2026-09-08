import { contextBridge } from "electron";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/** Packaged apps have no shell env to read from, so the API URL lives in a
 *  small JSON config file next to the executable (or userData on first run)
 *  that an admin can edit post-install without rebuilding — see
 *  apps/desktop/README for the exact path per platform. */
function readApiUrl(): string {
  const candidates = [
    path.join(process.resourcesPath ?? "", "config.json"),
    path.join(__dirname, "../config.json"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      try {
        const config = JSON.parse(readFileSync(file, "utf-8"));
        if (typeof config.apiUrl === "string" && config.apiUrl) return config.apiUrl;
      } catch {
        // fall through to default below
      }
    }
  }
  return "http://localhost:4000";
}

contextBridge.exposeInMainWorld("officeDesktop", {
  platform: process.platform,
  apiUrl: readApiUrl(),
});
