import { errorDetail } from "./utils.ts";

export const TOKEN_KEY = "aqarflow.access_token";
export const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
export function demoImage(filename: string) {
  return new URL(`/demo-media/${encodeURIComponent(filename)}`, API_URL).href;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function api<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new ApiError("Your session has ended. Please sign in again.", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" }); }
  catch { throw new Error("Unable to reach AqarFlow. Check your connection and the configured API server."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("aqarflow:unauthorized"));
    }
    throw new ApiError(errorDetail(data, `Request failed (${response.status}). Please try again.`), response.status);
  }
  return data as T;
}
export const json = (method: string, data?: unknown): RequestInit => ({ method, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
