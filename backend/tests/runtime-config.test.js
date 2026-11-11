import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "../src/runtime-config.js";

const deployed = {
  VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "fixture-aqarflow.vercel.app",
  DATABASE_URL: "postgresql://fixture:fixture@database.example.test/aqarflow",
  SECRET_KEY: "fixture-only-secret-key-at-least-32-characters",
  BLOB_STORE_ID: "store_fixture",
};

test("missing cloud configuration never starts an embedded database or generates a temporary key", () => {
  assert.throws(() => loadRuntimeConfig({}), /DATABASE_URL/);
  assert.throws(() => loadRuntimeConfig({ DATABASE_URL: deployed.DATABASE_URL }), /SECRET_KEY/);
  assert.throws(() => loadRuntimeConfig({ ...deployed, VERCEL: "", PUBLIC_API_URL: "" }), /PUBLIC_API_URL/);
  assert.throws(() => loadRuntimeConfig({ ...deployed, VERCEL: "", SECRET_KEY: "" }), /SECRET_KEY/);
});
test("Vercel requires hosted PostgreSQL, a stable secret and persistent photo storage", () => {
  for (const field of ["DATABASE_URL", "SECRET_KEY", "BLOB_STORE_ID"]) {
    assert.throws(() => loadRuntimeConfig({ ...deployed, [field]: "" }), new RegExp(field === "BLOB_STORE_ID" ? "Blob storage" : field));
  }
  const config = loadRuntimeConfig(deployed);
  assert.equal(config.vercel, true);
  assert.equal(config.publicApiUrl, "https://fixture-aqarflow.vercel.app");
  assert.equal(config.maxUploadMb, 4);
  assert.ok(config.origins.includes(config.publicApiUrl));
  assert.deepEqual(config.origins, [config.publicApiUrl]);
  assert.equal(config.uploadDir, undefined);
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
    { FRONTEND_ORIGINS: "*" }, { FRONTEND_ORIGINS: "https://example.test/path" },
    { FRONTEND_ORIGINS: "http://localhost:3000" }, { DATABASE_URL: "postgresql://localhost/aqarflow" },
    { DATABASE_URL: "postgresql://127.0.0.1/aqarflow" }, { DATABASE_URL: "postgresql://[::1]/aqarflow" },
  ]) {
    assert.throws(() => loadRuntimeConfig({ ...deployed, ...change }), (error) =>
      error instanceof Error && !error.message.includes("private-value"));
  }
});
