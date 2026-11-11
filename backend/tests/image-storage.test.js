import assert from "node:assert/strict";
import test from "node:test";
import { BlobError } from "@vercel/blob";
import { createImageStore } from "../src/image-storage.js";

const env = { VERCEL: "1", BLOB_STORE_ID: "store_fixture" };
const secureUrl = "https://fixture.public.blob.vercel-storage.com/aqarflow/fixture.jpg";

test("local photo storage remains local unless persistent storage is configured", () => {
  assert.equal(createImageStore({}), null);
  assert.throws(() => createImageStore({ VERCEL: "1" }), /Blob storage/);
  assert.throws(() => createImageStore({ NODE_ENV: "production" }), /Blob storage/);
});
test("public Blob uploads use processed bytes and record-scoped unique paths", async () => {
  const content = Buffer.from("processed-jpeg-fixture");
  const store = createImageStore(env, async (path, body, options) => {
    assert.match(path, /^aqarflow\/agency-1\/property-1\/[0-9a-f-]{36}\.jpg$/);
    assert.equal(body, content);
    assert.equal(options.access, "public");
    assert.equal(options.contentType, "image/jpeg");
    assert.equal(options.addRandomSuffix, false);
    assert.equal(options.storeId, env.BLOB_STORE_ID);
    assert.equal(options.token, undefined);
    assert.ok(options.abortSignal instanceof AbortSignal);
    return { url: secureUrl };
  });
  assert.equal(await store(content, { agencyId: "agency-1", propertyId: "property-1" }), secureUrl);
});
test("local external-storage use may pass a static token without changing Vercel OIDC behavior", async () => {
  const store = createImageStore({ BLOB_READ_WRITE_TOKEN: "fixture-only-not-a-real-token" }, async (_path, _body, options) => {
    assert.equal(options.token, "fixture-only-not-a-real-token");
    return { url: secureUrl };
  });
  assert.equal(await store(Buffer.from("fixture"), { agencyId: "a", propertyId: "p" }), secureUrl);
});
test("provider failures are surfaced safely without accepting fabricated URLs", async () => {
  const failed = createImageStore(env, async () => { throw new BlobError("fixture provider details"); });
  await assert.rejects(failed(Buffer.from("fixture"), { agencyId: "a", propertyId: "p" }),
    (error) => error.status === 502 && !error.message.includes("fixture provider details"));
  for (const url of [undefined, "http://fixture.public.blob.vercel-storage.com/a.jpg", "https://untrusted.example/a.jpg"]) {
    await assert.rejects(createImageStore(env, async () => ({ url }))(Buffer.from("fixture"), { agencyId: "a", propertyId: "p" }),
      (error) => error.status === 502);
  }
});
test("unexpected programming errors are not disguised as provider outages", async () => {
  const failure = new Error("fixture programming error");
  const store = createImageStore(env, async () => { throw failure; });
  await assert.rejects(store(Buffer.from("fixture"), { agencyId: "a", propertyId: "p" }), (error) => error === failure);
});
