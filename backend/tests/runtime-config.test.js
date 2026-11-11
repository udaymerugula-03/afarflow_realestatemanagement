import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "../src/runtime-config.js";

const deployed = {
  VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "fixture-aqarflow.vercel.app",
  DATABASE_URL: "postgresql://fixture:fixture@database.example.test/aqarflow",
  SECRET_KEY: "fixture-only-secret-key-at-least-32-characters",
  BLOB_STORE_ID: "store_fixture",
};

test("local development retains embedded PostgreSQL and a temporary signing key", () => {
  const config = loadRuntimeConfig({});
  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.temporarySecret, true);
  assert.ok(config.secret.length >= 32);
  assert.equal(config.publicApiUrl, "http://localhost:8000");
  assert.equal(config.maxUploadMb, 5);
  assert.ok(config.origins.includes("http://localhost:3000"));
});
test("Vercel requires hosted PostgreSQL, a stable secret and persistent photo storage", () => {
  for (const field of ["DATABASE_URL", "SECRET_KEY", "BLOB_STORE_ID"]) {
    assert.throws(() => loadRuntimeConfig({ ...deployed, [field]: "" }), new RegExp(field === "BLOB_STORE_ID" ? "Blob storage" : field));
  }
  const config = loadRuntimeConfig(deployed);
  assert.equal(config.vercel, true);
  assert.equal(config.temporarySecret, false);
  assert.equal(config.publicApiUrl, "https://fixture-aqarflow.vercel.app");
  assert.equal(config.maxUploadMb, 4);
  assert.ok(config.origins.includes(config.publicApiUrl));
});
test("preview assets use the preview deployment rather than the production host", () => {
  const config = loadRuntimeConfig({ ...deployed, VERCEL_ENV: "preview", VERCEL_URL: "fixture-preview.vercel.app" });
  assert.equal(config.publicApiUrl, "https://fixture-preview.vercel.app");
});
test("invalid deployment configuration is rejected without echoing connection secrets", () => {
  for (const change of [
    { DATABASE_URL: "https://not-postgres.example" }, { SECRET_KEY: "short" },
    { PUBLIC_API_URL: "http://localhost:8000" }, { PUBLIC_API_URL: "https://example.test/api/v1" },
    { PUBLIC_API_URL: "https://fixture:private-value@example.test" },
    { FRONTEND_ORIGINS: "*" }, { FRONTEND_ORIGINS: "https://example.test/path" }, { PORT: "0" },
  ]) {
    assert.throws(() => loadRuntimeConfig({ ...deployed, ...change }), (error) =>
      error instanceof Error && !error.message.includes("private-value"));
  }
});
