import test from "node:test";
import assert from "node:assert/strict";
import { api, API_URL, ApiError, demoImage, json, TOKEN_KEY } from "../lib/api.ts";

test("API defaults to the cloud page's own origin and photographs use deployed origins", () => {
  assert.equal(API_URL, "/api/v1");
  assert.equal(demoImage("villa.jpg", "https://fixture-api.example.test/api/v1"), "https://fixture-api.example.test/demo-media/villa.jpg");
  assert.equal(demoImage("villa.jpg", "/api/v1", "https://fixture-aqarflow.vercel.app"), "https://fixture-aqarflow.vercel.app/demo-media/villa.jpg");
});

function setup() {
  const values = new Map<string, string>();
  const events = new EventTarget();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: events });
  return { values, events };
}
test("authenticated JSON requests send the session bearer token", async (context) => {
  const { values } = setup(); values.set(TOKEN_KEY, "test-access");
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.ok(url.endsWith("/leads"));
    const headers = new Headers(options.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-access");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(String(options.body)), { name: "Test" });
    return Response.json({ id: "lead-1" });
  });
  assert.deepEqual(await api("/leads", json("POST", { name: "Test" })), { id: "lead-1" });
});
test("public requests never attach an existing access token", async (context) => {
  const { values } = setup(); values.set(TOKEN_KEY, "test-access");
  context.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("Authorization"), null);
    return Response.json({ items: [] });
  });
  await api("/public/properties", {}, false);
});
test("unauthorized responses clear session storage and notify the auth provider", async (context) => {
  const { values, events } = setup(); values.set(TOKEN_KEY, "expired");
  let notified = false; events.addEventListener("aqarflow:unauthorized", () => { notified = true; });
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Expired access token" }, { status: 401 }));
  await assert.rejects(api("/auth/me"), (error: unknown) => error instanceof ApiError && error.status === 401 && error.message === "Expired access token");
  assert.equal(values.has(TOKEN_KEY), false); assert.equal(notified, true);
});
test("visit conflict errors preserve server detail and status", async (context) => {
  const { values } = setup(); values.set(TOKEN_KEY, "test");
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Agent already has a visit at this time." }, { status: 409 }));
  await assert.rejects(api("/visits", json("POST", {})), (error: unknown) => error instanceof ApiError && error.status === 409 && /already has a visit/.test(error.message));
});
test("image uploads let the browser supply the multipart boundary", async (context) => {
  const { values } = setup(); values.set(TOKEN_KEY, "test");
  const body = new FormData(); body.append("file", new Blob(["image"], { type: "image/png" }), "photo.png");
  context.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("Content-Type"), null);
    assert.equal(options.body, body);
    return Response.json({ images: ["http://localhost:8000/uploads/photo.png"] });
  });
  await api("/properties/p1/images", { method: "POST", body });
});
test("network failures and missing sessions cannot produce a success response", async (context) => {
  const { values } = setup();
  await assert.rejects(api("/leads"), /session has ended/);
  values.set(TOKEN_KEY, "test");
  context.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(api("/leads"), /Unable to reach AqarFlow/);
});
