import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import sharp from "sharp";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createApp } from "../src/app.js";
import { connectDatabase, insert, migrate } from "../src/database.js";

let db, api, directory;
const headers = {};
const people = {};
const password = "CorrectPassword123!";
let password_hash;

before(async () => {
  directory = await mkdtemp(path.resolve(".aqarflow-test-"));
  db = await connectDatabase(undefined, "memory://");
  await migrate(db);
  password_hash = await bcrypt.hash(password, 4);
});
after(async () => {
  await db?.close();
  await rm(directory, { recursive: true, force: true });
});
beforeEach(async () => {
  await db.exec("TRUNCATE agencies,users,sessions,properties,leads,activities,visits,deals,audit_logs,rate_buckets CASCADE");
  const a = await insert(db, "agencies", { id: randomUUID(), name: "Agency A" });
  const b = await insert(db, "agencies", { id: randomUUID(), name: "Agency B" });
  api = request(createApp(db, { secret: "test-only-signing-key-not-for-production-123456", uploadDir: directory }));
  for (const [name, agency, role] of [["admin", a, "admin"], ["agent", a, "agent"], ["other", b, "admin"], ["second", a, "agent"]]) {
    const user = await insert(db, "users", { id: randomUUID(), agency_id: agency.id, full_name: name, email: `${name}@example.com`, password_hash, role });
    people[name] = user.id;
    const response = await api.post("/api/v1/auth/login").send({ email: user.email, password }).expect(200);
    headers[name] = { Authorization: `Bearer ${response.body.access_token}` };
  }
});

function propertyData(overrides = {}) {
  return {
    reference_code: "AF-100", title: "Family home", description: "Spacious family home",
    purpose: "sale", type: "house", price: "25000000", area: 2400, area_unit: "sq ft",
    bedrooms: 4, bathrooms: 3, address: "DHA Phase 6", city: "Lahore", locality: "DHA Phase 6",
    status: "available", published: true, ...overrides,
  };
}
async function property(overrides) {
  return (await api.post("/api/v1/properties").set(headers.admin).send(propertyData(overrides)).expect(201)).body;
}
async function inquiry(item) {
  return (await api.post("/api/v1/public/inquiries").send({
    property_id: item.id, name: "Buyer", email: "buyer@example.com", phone: "+923001234567",
    message: "Please arrange a visit", consent: true,
  }).expect(201)).body.id;
}

test("login, role checks and revocable logout", async () => {
  await api.get("/api/v1/properties").expect(401);
  await api.post("/api/v1/auth/login").send({ email: "unknown@example.com", password: "wrong" }).expect(401);
  await api.post("/api/v1/properties").set(headers.agent).send(propertyData()).expect(403);
  await api.post("/api/v1/auth/logout").set(headers.agent).expect(200);
  await api.get("/api/v1/auth/me").set(headers.agent).expect(401);
});

test("public listings, filters, pagination, unpublish and tenant isolation", async () => {
  const item = await property();
  const draft = await property({ reference_code: "AF-101", published: false });
  const result = await api.get("/api/v1/public/properties").expect(200);
  assert.equal(result.body.total, 1);
  assert.equal(result.body.items[0].agency_id, undefined);
  assert.equal((await api.get("/api/v1/public/properties?q=%25")).body.total, 0);
  assert.equal((await api.get("/api/v1/public/properties?city=Pune")).body.total, 0);
  assert.equal((await api.get("/api/v1/public/properties?max_price=1000")).body.total, 0);
  await api.get(`/api/v1/public/properties/${draft.id}`).expect(404);
  await api.get(`/api/v1/properties/${item.id}`).set(headers.other).expect(404);
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ published: false }).expect(200);
  assert.equal((await api.get("/api/v1/public/properties")).body.total, 0);
  await api.get("/api/v1/public/properties?page_size=101").expect(422);
});

test("inquiry -> assignment -> notes -> visit -> booking -> closed deal", async () => {
  const item = await property();
  const leadId = await inquiry(item);
  const leadUrl = `/api/v1/leads/${leadId}`;
  await api.get(leadUrl).set(headers.agent).expect(404);
  await api.get(leadUrl).set(headers.other).expect(404);
  await api.patch(leadUrl).set(headers.admin).send({ assigned_agent_id: people.agent, stage: "contacted" }).expect(200);
  await api.get(leadUrl).set(headers.agent).expect(200);
  await api.get(leadUrl).set(headers.second).expect(404);
  await api.patch(leadUrl).set(headers.agent).send({ assigned_agent_id: people.second }).expect(403);
  await api.post(`${leadUrl}/activities`).set(headers.agent).send({ body: "Buyer contacted" }).expect(201);
  const start = Date.now() + 2 * 86400000;
  const visit = { lead_id: leadId, property_id: item.id, agent_id: people.agent, starts_at: new Date(start).toISOString(), ends_at: new Date(start + 3600000).toISOString(), notes: "" };
  const response = await api.post("/api/v1/visits").set(headers.agent).send(visit).expect(201);
  await api.post("/api/v1/visits").set(headers.agent).send(visit).expect(409);
  await api.patch(`/api/v1/visits/${response.body.id}`).set(headers.agent).send({ status: "completed" }).expect(200);
  const deal = { lead_id: leadId, property_id: item.id, agent_id: people.agent, stage: "booking", offer_amount: "24000000", notes: "Booking confirmed" };
  const booking = await api.post("/api/v1/deals").set(headers.agent).send(deal).expect(201);
  assert.equal((await api.get(`/api/v1/properties/${item.id}`).set(headers.admin)).body.status, "reserved");
  await api.post("/api/v1/deals").set(headers.agent).send(deal).expect(409);
  await api.patch(`/api/v1/deals/${booking.body.id}`).set(headers.agent).send({ stage: "closed_won" }).expect(200);
  assert.equal((await api.get(leadUrl).set(headers.agent)).body.stage, "converted");
  assert.equal((await api.get("/api/v1/public/properties")).body.total, 0);
  const dashboard = (await api.get("/api/v1/reports/dashboard").set(headers.agent)).body;
  assert.equal(dashboard.total_leads, 1);
  assert.equal(dashboard.open_deals, 0);
  assert.equal((await api.get("/api/v1/reports/dashboard").set(headers.second)).body.total_leads, 0);
  await api.patch(`/api/v1/deals/${booking.body.id}`).set(headers.agent).send({ stage: "offer" }).expect(409);
});

test("validation, duplicate reference codes and valid/invalid image uploads", async () => {
  const item = await property();
  await api.post("/api/v1/properties").set(headers.admin).send(propertyData()).expect(409);
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ price: -1 }).expect(422);
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ title: null }).expect(422);
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ agency_id: randomUUID() }).expect(422);
  await api.post(`/api/v1/properties/${item.id}/images`).set(headers.admin).attach("file", Buffer.from("not an image"), "bad.jpg").expect(422);
  const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#123456" } }).png().toBuffer();
  const uploaded = await api.post(`/api/v1/properties/${item.id}/images`).set(headers.admin).attach("file", image, "photo.png").expect(200);
  const filename = uploaded.body.images[0].split("/").at(-1);
  await api.get(`/media/${filename}`).expect(200).expect("Content-Type", /image\/jpeg/);
  await api.post("/api/v1/public/inquiries").send({ property_id: item.id, name: "Buyer", email: "bad", phone: "invalid", message: "Test", consent: false }).expect(422);
});

test("cross-agency assignment protection, linked records, and agent creation", async () => {
  const item = await property();
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ assigned_agent_id: people.other }).expect(422);
  const leadId = await inquiry(item);
  await api.patch(`/api/v1/leads/${leadId}`).set(headers.admin).send({ assigned_agent_id: people.agent }).expect(200);
  const second = await property({ reference_code: "AF-102" });
  await api.post("/api/v1/deals").set(headers.admin).send({ lead_id: leadId, property_id: second.id, agent_id: people.agent, offer_amount: "10" }).expect(422);
  const user = { full_name: "New Staff", email: "staff@example.com", password: "LongPassword123!" };
  const created = await api.post("/api/v1/users").set(headers.admin).send(user).expect(201);
  assert.equal(created.body.password_hash, undefined);
  await api.post("/api/v1/users").set(headers.agent).send(user).expect(403);
  await api.post("/api/v1/users").set(headers.admin).send({ ...user, email: "invalid" }).expect(422);
});

test("archiving removes listings and API rate limiting rejects excessive login attempts", async () => {
  const item = await property();
  await api.delete(`/api/v1/properties/${item.id}`).set(headers.admin).expect(200);
  assert.equal((await api.get("/api/v1/public/properties")).body.total, 0);
  for (let i = 0; i < 6; i++) await api.post("/api/v1/auth/login").send({ email: "bad@example.com", password: "wrong" }).expect(401);
  await api.post("/api/v1/auth/login").send({ email: "bad@example.com", password: "wrong" }).expect(429);
});

test("migration is repeatable and uses PostgreSQL tables", async () => {
  await migrate(db);
  const result = await db.query("SELECT version FROM schema_migrations ORDER BY version");
  assert.deepEqual(result.rows.map((row) => row.version), ["001", "002", "003", "004"]);
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.ok(tables.rows.some((row) => row.tablename === "properties"));
});

test("cancelled visits cannot be reactivated into a conflicting time slot", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  const start = Date.now() + 86400000;
  const payload = {
    lead_id: leadId, property_id: item.id, agent_id: people.agent,
    starts_at: new Date(start).toISOString(), ends_at: new Date(start + 3600000).toISOString(),
  };
  const first = await api.post("/api/v1/visits").set(headers.agent).send(payload).expect(201);
  await api.patch(`/api/v1/visits/${first.body.id}`).set(headers.agent).send({ status: "cancelled" }).expect(200);
  await api.post("/api/v1/visits").set(headers.agent).send(payload).expect(201);
  await api.patch(`/api/v1/visits/${first.body.id}`).set(headers.agent).send({ status: "confirmed" }).expect(409);
  await api.post("/api/v1/visits").set(headers.agent).send({ ...payload, ends_at: payload.starts_at }).expect(422);
});

test("reservation release and archive protection preserve deal workflow", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  await api.patch(`/api/v1/leads/${leadId}`).set(headers.agent).send({ stage: "qualified" }).expect(200);
  const deal = await api.post("/api/v1/deals").set(headers.agent).send({
    lead_id: leadId, property_id: item.id, agent_id: people.agent, stage: "booking", offer_amount: "100000",
  }).expect(201);
  await api.delete(`/api/v1/properties/${item.id}`).set(headers.admin).expect(409);
  await api.patch(`/api/v1/deals/${deal.body.id}`).set(headers.agent).send({ stage: "closed_lost" }).expect(200);
  assert.equal((await api.get(`/api/v1/properties/${item.id}`).set(headers.admin)).body.status, "available");
  await api.delete(`/api/v1/properties/${item.id}`).set(headers.admin).expect(200);
});

test("interactive REST documentation and health are accessible", async () => {
  const health = await api.get("/health").expect(200);
  assert.equal(health.body.database, "PostgreSQL");
  const specification = await api.get("/openapi.json").expect(200);
  assert.ok(specification.body.paths["/api/v1/public/inquiries"].post.requestBody);
  assert.ok(specification.body.components.schemas.propertyCreate.properties.price);
  assert.ok(specification.body.paths["/api/v1/properties/{id}/history"].get);
  assert.ok(specification.body.components.schemas.leadPatch.properties.phone);
  assert.deepEqual(specification.body.components.schemas.visitCreate.properties.status.enum, ["requested", "confirmed"]);
  await api.get("/docs/").expect(200);
});

test("property reference search matches case-insensitively without bypassing visibility or tenant scope", async () => {
  const item = await property();
  await property({ reference_code: "AF-PRIVATE", published: false });
  assert.equal((await api.get("/api/v1/public/properties?q=af-100")).body.items[0].id, item.id);
  assert.equal((await api.get("/api/v1/public/properties?q=AF-PRIVATE")).body.total, 0);
  assert.equal((await api.get("/api/v1/properties?q=af-private").set(headers.admin)).body.total, 1);
  assert.equal((await api.get("/api/v1/properties?q=AF-100").set(headers.other)).body.total, 0);
});

test("contact editing validates and normalizes data while preserving inquiry history and permissions", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  const url = `/api/v1/leads/${leadId}`;
  await api.post(`${url}/activities`).set(headers.agent).send({ body: "Original customer note" }).expect(201);
  const changes = { name: "  Buyer Updated  ", email: "UPDATED@EXAMPLE.COM", phone: "+92 (300) 765-4321", message: "Updated requirements" };
  await api.patch(url).set(headers.second).send(changes).expect(404);
  await api.patch(url).set(headers.other).send(changes).expect(404);
  const edited = (await api.patch(url).set(headers.agent).send(changes).expect(200)).body;
  assert.equal(edited.name, "Buyer Updated");
  assert.equal(edited.email, "updated@example.com");
  assert.equal(edited.phone, "+923007654321");
  assert.equal(edited.message, changes.message);
  assert.equal(edited.property_id, item.id);
  assert.equal(edited.assigned_agent_id, people.agent);
  assert.ok(edited.activities.some((entry) => entry.body === "Original customer note"));
  assert.ok(edited.activities.some((entry) => entry.body === "Updated Contact and inquiry details"));
  for (const bad of [{}, { name: "A" }, { email: "not-an-email" }, { phone: "invalid" }, { message: "" }, { property_id: randomUUID() }]) {
    await api.patch(url).set(headers.admin).send(bad).expect(422);
  }
  await api.patch(url).set(headers.admin).send({ name: "Admin edit" }).expect(200);
  const after = (await api.get(url).set(headers.agent)).body;
  assert.equal(after.name, "Admin edit");
  assert.equal(after.email, edited.email);
});

test("requested visits reserve the agent slot and can be confirmed without self-conflict", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  const start = Date.now() + 86400000;
  const payload = {
    lead_id: leadId, property_id: item.id, agent_id: people.agent, status: "requested",
    starts_at: new Date(start).toISOString(), ends_at: new Date(start + 3600000).toISOString(),
  };
  const visit = (await api.post("/api/v1/visits").set(headers.agent).send(payload).expect(201)).body;
  assert.equal(visit.status, "requested");
  await api.post("/api/v1/visits").set(headers.admin).send({ ...payload, status: "confirmed" }).expect(409);
  await api.patch(`/api/v1/visits/${visit.id}`).set(headers.second).send({ status: "confirmed" }).expect(404);
  await api.patch(`/api/v1/visits/${visit.id}`).set(headers.agent).send({ status: "confirmed" }).expect(200);
  await api.post("/api/v1/visits").set(headers.agent).send({ ...payload, status: "completed" }).expect(422);
});

test("deals require a qualified lead and cannot confirm after the lead is lost", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  const leadUrl = `/api/v1/leads/${leadId}`;
  const payload = { lead_id: leadId, property_id: item.id, agent_id: people.agent, offer_amount: "100000" };
  for (const stage of ["new", "contacted", "lost", "converted"]) {
    await api.patch(leadUrl).set(headers.agent).send({ stage }).expect(200);
    await api.post("/api/v1/deals").set(headers.agent).send(payload).expect(409);
  }
  assert.equal((await api.get("/api/v1/deals").set(headers.agent)).body.length, 0);
  await api.patch(leadUrl).set(headers.agent).send({ stage: "qualified" }).expect(200);
  const deal = (await api.post("/api/v1/deals").set(headers.agent).send(payload).expect(201)).body;
  await api.patch(leadUrl).set(headers.agent).send({ stage: "lost" }).expect(200);
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ stage: "booking" }).expect(409);
  assert.equal((await api.get(`/api/v1/properties/${item.id}`).set(headers.admin)).body.status, "available");
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ notes: "Qualification to be reviewed" }).expect(200);
  await api.patch(leadUrl).set(headers.agent).send({ stage: "negotiation" }).expect(200);
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ stage: "closed_won" }).expect(200);
  const historyBefore = (await api.get(`/api/v1/properties/${item.id}/history`).set(headers.admin)).body;
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ notes: "Final handover note" }).expect(200);
  assert.deepEqual((await api.get(`/api/v1/properties/${item.id}/history`).set(headers.admin)).body, historyBefore);
});

test("property history records publishing and deal status changes without exposing another agency", async () => {
  const item = await property({ assigned_agent_id: people.agent });
  const url = `/api/v1/properties/${item.id}/history`;
  await api.get(url).expect(401);
  await api.get(url).set(headers.other).expect(404);
  const initial = (await api.get(url).set(headers.agent).expect(200)).body;
  assert.equal(initial[0].action, "property.created");
  assert.equal(initial[0].details.after.status, "available");
  await api.patch(`/api/v1/properties/${item.id}`).set(headers.admin).send({ published: false }).expect(200);
  const leadId = (await api.post("/api/v1/leads").set(headers.agent).send({
    property_id: item.id, name: "Buyer", email: "buyer@example.com", phone: "+923001234567", message: "Contact record",
  }).expect(201)).body.id;
  await api.patch(`/api/v1/leads/${leadId}`).set(headers.agent).send({ stage: "qualified" }).expect(200);
  const deal = (await api.post("/api/v1/deals").set(headers.agent).send({
    lead_id: leadId, property_id: item.id, agent_id: people.agent, stage: "booking", offer_amount: "100000",
  }).expect(201)).body;
  const bookingHistory = (await api.get(url).set(headers.admin)).body;
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ stage: "documentation" }).expect(200);
  assert.equal((await api.get(`/api/v1/properties/${item.id}`).set(headers.admin)).body.status, "reserved");
  assert.deepEqual((await api.get(url).set(headers.admin)).body, bookingHistory);
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ stage: "closed_won" }).expect(200);
  const history = (await api.get(url).set(headers.admin).expect(200)).body;
  assert.ok(history.some((event) => event.details.before?.published === true && event.details.after?.published === false));
  assert.ok(history.some((event) => event.details.before?.status === "available" && event.details.after?.status === "reserved"));
  assert.ok(history.some((event) => event.details.before?.status === "reserved" && event.details.after?.status === "sold"));
  assert.ok(history.every((event) => event.action.startsWith("property.")));
  assert.ok(history.every((event) => event.agency_id === undefined && event.entity_id === undefined));
  assert.ok(history.every((event) => event.actor_id === people.admin || event.actor_id === people.agent));
});

test("rent-purpose deals close as rented and retain their property status history", async () => {
  const item = await property({ purpose: "rent", assigned_agent_id: people.agent });
  const leadId = await inquiry(item);
  await api.patch(`/api/v1/leads/${leadId}`).set(headers.agent).send({ stage: "qualified" }).expect(200);
  const deal = (await api.post("/api/v1/deals").set(headers.agent).send({
    lead_id: leadId, property_id: item.id, agent_id: people.agent, stage: "booking", offer_amount: "85000",
  }).expect(201)).body;
  await api.patch(`/api/v1/deals/${deal.id}`).set(headers.agent).send({ stage: "closed_won" }).expect(200);
  const saved = (await api.get(`/api/v1/properties/${item.id}`).set(headers.agent)).body;
  assert.equal(saved.status, "rented");
  assert.equal(saved.published, false);
  await api.get(`/api/v1/public/properties/${item.id}`).expect(404);
  const history = (await api.get(`/api/v1/properties/${item.id}/history`).set(headers.agent)).body;
  assert.ok(history.some((event) => event.details.before?.status === "reserved" && event.details.after?.status === "rented"));
  assert.equal((await api.get(`/api/v1/leads/${leadId}`).set(headers.agent)).body.stage, "converted");
});

test("local PostgreSQL data survives closing and reopening the database", async () => {
  const directoryPath = path.join(directory, "persistent-postgres");
  const first = await connectDatabase(undefined, directoryPath);
  const agencyId = randomUUID();
  try {
    await migrate(first);
    await insert(first, "agencies", { id: agencyId, name: "Persistent agency" });
  } finally { await first.close(); }
  const reopened = await connectDatabase(undefined, directoryPath);
  try {
    const saved = await reopened.query("SELECT name FROM agencies WHERE id=$1", [agencyId]);
    assert.equal(saved.rows[0].name, "Persistent agency");
  } finally { await reopened.close(); }
});

test("PKR defaults, compatible area units and local demo images work across property endpoints", async () => {
  const item = await property({ area_unit: "sq yd" });
  assert.equal(item.currency, "PKR");
  await api.post("/api/v1/properties").set(headers.admin).send(propertyData({ reference_code: "OLD-CURRENCY", currency: "INR" })).expect(422);
  await db.query("UPDATE properties SET images=$1::jsonb WHERE id=$2", [JSON.stringify(["/demo-media/villa.jpg"]), item.id]);
  const expected = "http://localhost:8000/demo-media/villa.jpg";
  for (const [url, authHeaders] of [
    [`/api/v1/public/properties/${item.id}`, {}],
    [`/api/v1/properties/${item.id}`, headers.admin],
  ]) {
    const response = await api.get(url).set(authHeaders).expect(200);
    assert.equal(response.body.currency, "PKR");
    assert.equal(response.body.images[0], expected);
  }
  assert.equal((await api.get("/api/v1/public/properties")).body.items[0].images[0], expected);
  assert.equal((await api.get("/api/v1/properties").set(headers.admin)).body.items[0].images[0], expected);
  for (const name of ["villa", "apartment", "plot", "neighborhood"]) {
    await api.get(`/demo-media/${name}.jpg`).expect(200).expect("Content-Type", /image\/jpeg/);
    const metadata = await sharp(await readFile(new URL(`../public/demo/${name}.jpg`, import.meta.url))).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.ok(metadata.width >= 1200);
  }
  for (const area_unit of ["marla", "kanal", "sq ft", "sq m", "acre", "cent"]) {
    assert.equal((await property({ reference_code: `UNIT-${area_unit}`, area_unit })).currency, "PKR");
  }
});

test("historical India/photo migrations finish in Pakistan without losing IDs, uploads or notes", async () => {
  const legacy = await connectDatabase(undefined, "memory://");
  try {
    await legacy.exec(await readFile(new URL("../migrations/001_initial.sql", import.meta.url), "utf8"));
    await legacy.exec("CREATE TABLE schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO schema_migrations(version) VALUES('001')");
    const agency = await insert(legacy, "agencies", { id: randomUUID(), name: "VIRELEO" });
    const user = await insert(legacy, "users", { id: randomUUID(), agency_id: agency.id, full_name: "Admin", email: "legacy@example.com", role: "admin", password_hash });
    const sample = await insert(legacy, "properties", {
      id: randomUUID(), agency_id: agency.id, ...propertyData(),
      reference_code: "AF-001", city: "Lahore", description: "Illustrative demonstration listing, not a real property advertisement.",
    });
    const uploaded = "http://localhost:8000/media/original-photo.jpg";
    const custom = await insert(legacy, "properties", {
      id: randomUUID(), agency_id: agency.id, ...propertyData(), reference_code: "CUSTOM-1",
      title: "Keep my edited listing", images: [uploaded, "/demo-media/apartment.svg", "/demo-media/neighborhood.svg"],
    });
    const lead = await insert(legacy, "leads", { id: randomUUID(), agency_id: agency.id, property_id: sample.id, name: "Demo Customer", email: "customer@example.com", phone: "+923001234567", message: "Keep this inquiry" });
    await insert(legacy, "activities", { id: randomUUID(), agency_id: agency.id, lead_id: lead.id, actor_id: user.id, body: "Original note" });
    await migrate(legacy);
    await migrate(legacy);
    const changed = (await legacy.query("SELECT * FROM properties WHERE id=$1", [sample.id])).rows[0];
    assert.equal(changed.id, sample.id);
    assert.equal(changed.city, "Lahore");
    assert.equal(changed.currency, "PKR");
    assert.equal(changed.area_unit, "marla");
    assert.equal(changed.area, 10);
    assert.equal(changed.price, "42500000.00");
    assert.deepEqual(changed.images, ["/demo-media/villa.jpg"]);
    const unchanged = (await legacy.query("SELECT * FROM properties WHERE id=$1", [custom.id])).rows[0];
    assert.equal(unchanged.title, "Keep my edited listing");
    assert.equal(unchanged.price, "25000000.00");
    assert.deepEqual(unchanged.images, [uploaded, "/demo-media/apartment.jpg"]);
    assert.equal((await legacy.query("SELECT phone FROM leads WHERE id=$1", [lead.id])).rows[0].phone, "+923001234567");
    assert.equal((await legacy.query("SELECT body FROM activities WHERE lead_id=$1", [lead.id])).rows[0].body, "Original note");
  } finally { await legacy.close(); }
});

test("004 restores only original Indian-city demos and preserves all images, accounts and workflows", async () => {
  const legacy = await connectDatabase(undefined, "memory://");
  try {
    for (const filename of ["001_initial.sql", "002_india_demo.sql", "003_real_demo_photos.sql"]) {
      await legacy.exec(await readFile(new URL(`../migrations/${filename}`, import.meta.url), "utf8"));
    }
    await legacy.exec("CREATE TABLE schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO schema_migrations(version) VALUES('001'),('002'),('003')");
    const agency = await insert(legacy, "agencies", { id: randomUUID(), name: "VIRELEO" });
    const user = await insert(legacy, "users", { id: randomUUID(), agency_id: agency.id, full_name: "VIRELEO Agent", email: "agent@vireleo.local", role: "agent", password_hash });
    const images = ["/demo-media/villa.jpg", "/demo-media/neighborhood.jpg", "http://localhost:8000/media/original-photo.jpg"];
    const samples = [];
    for (const [reference_code, city] of [["AF-001", "Bengaluru"], ["AF-002", "Hyderabad"], ["AF-003", "Pune"]]) {
      samples.push(await insert(legacy, "properties", {
        id: randomUUID(), agency_id: agency.id, ...propertyData(), reference_code, city, images,
        description: "Illustrative demonstration listing, not a real property advertisement.",
      }));
    }
    const custom = await insert(legacy, "properties", {
      id: randomUUID(), agency_id: agency.id, ...propertyData(), reference_code: "CUSTOM-1",
      city: "Bengaluru", price: "12345.67", images, area_unit: "cent",
    });
    const otherAgency = await insert(legacy, "agencies", { id: randomUUID(), name: "Custom agency" });
    const edited = await insert(legacy, "properties", {
      id: randomUUID(), agency_id: otherAgency.id, ...propertyData(), reference_code: "AF-001",
      city: "Bengaluru", description: "My custom listing", images,
    });
    const lead = await insert(legacy, "leads", { id: randomUUID(), agency_id: agency.id, property_id: samples[0].id, name: "Demo Customer", email: "customer@example.com", phone: "+919000000000", message: "Keep inquiry", assigned_agent_id: user.id });
    const customLead = await insert(legacy, "leads", { id: randomUUID(), agency_id: agency.id, property_id: custom.id, name: "Real Customer", email: "customer@example.com", phone: "+919000000000", message: "Do not change phone" });
    await insert(legacy, "activities", { id: randomUUID(), agency_id: agency.id, lead_id: lead.id, actor_id: user.id, body: "Keep note" });
    await insert(legacy, "visits", { id: randomUUID(), agency_id: agency.id, lead_id: lead.id, property_id: samples[0].id, agent_id: user.id, starts_at: "2030-01-01T10:00:00Z", ends_at: "2030-01-01T11:00:00Z", notes: "Keep visit" });
    await insert(legacy, "deals", { id: randomUUID(), agency_id: agency.id, lead_id: lead.id, property_id: samples[0].id, agent_id: user.id, offer_amount: "76543.21", notes: "Keep deal" });
    const before = {};
    for (const table of ["users", "activities", "visits", "deals"]) before[table] = (await legacy.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
    await migrate(legacy);
    await migrate(legacy);
    for (const [index, [city, locality, price, area, unit]] of [
      ["Lahore", "DHA Phase 6", "42500000.00", 10, "marla"],
      ["Islamabad", "Bahria Town", "85000.00", 1450, "sq ft"],
      ["Karachi", "Scheme 33", "18000000.00", 240, "sq yd"],
    ].entries()) {
      const saved = (await legacy.query("SELECT * FROM properties WHERE id=$1", [samples[index].id])).rows[0];
      assert.deepEqual([saved.city, saved.locality, saved.price, saved.area, saved.area_unit], [city, locality, price, area, unit]);
      assert.equal(saved.currency, "PKR");
      assert.deepEqual(saved.images, images);
    }
    for (const original of [custom, edited]) {
      assert.deepEqual((await legacy.query("SELECT * FROM properties WHERE id=$1", [original.id])).rows[0], { ...original, currency: "PKR" });
    }
    for (const table of Object.keys(before)) assert.deepEqual((await legacy.query(`SELECT * FROM ${table} ORDER BY id`)).rows, before[table]);
    assert.deepEqual((await legacy.query("SELECT * FROM leads WHERE id=$1", [lead.id])).rows[0], { ...lead, phone: "+923001234567" });
    assert.deepEqual((await legacy.query("SELECT * FROM leads WHERE id=$1", [customLead.id])).rows[0], customLead);
    const newProperty = await insert(legacy, "properties", { id: randomUUID(), agency_id: agency.id, ...propertyData(), reference_code: "NEW-PKR" });
    assert.equal(newProperty.currency, "PKR");
  } finally { await legacy.close(); }
});
