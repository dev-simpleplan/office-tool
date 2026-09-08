// The Electron shell exposes a runtime-configurable API URL (read from a
// config file next to the packaged app, not baked in at build time like
// VITE_API_URL) via preload.ts — prefer it when running inside Electron.
const API_URL =
  (window as { officeDesktop?: { apiUrl?: string } }).officeDesktop?.apiUrl ??
  (import.meta.env.VITE_API_URL as string);

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  async postFile<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, body);
    }
    return body as T;
  },
  async getBlobUrl(path: string): Promise<string | null> {
    const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  async downloadBlob(path: string, filename: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
    if (!res.ok) {
      throw new ApiError(res.status, await res.json().catch(() => null));
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
