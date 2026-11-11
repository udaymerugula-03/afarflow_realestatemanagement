import test from "node:test";
import assert from "node:assert/strict";
import { agentPayload, AGENT_PASSWORD_MIN_LENGTH, canCreateDeal, propertyPayload } from "../lib/forms.ts";

test("only qualified, visit-scheduled, and negotiation leads can create a deal", () => {
  for (const stage of ["qualified", "visit_scheduled", "negotiation"]) assert.equal(canCreateDeal(stage), true, stage);
  for (const stage of ["new", "contacted", "lost", "converted", "", "unknown", "Qualified", null, undefined]) {
    assert.equal(canCreateDeal(stage), false, String(stage));
  }
});

function propertyForm() {
  const data = new FormData();
  const values = {
    reference_code: "AF-001", title: "Garden house", description: "A welcoming home.",
    purpose: "sale", type: "House", price: "25000000.00", area: "2400", area_unit: "sq ft",
    bedrooms: "3", bathrooms: "2", address: "Street 1", city: "Lahore", locality: "DHA Phase 6",
    status: "available", assigned_agent_id: "agent-1", published: "on",
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("property creation sends supported fields and leaves images to the upload endpoint", () => {
  const data = propertyForm();
  data.set("images", "https://example.invalid/photo.png");
  data.set("agency_id", "another-agency");
  data.set("id", "untrusted-id");
  const payload = propertyPayload(data, true);
  assert.equal("images" in payload, false);
  assert.equal("agency_id" in payload, false);
  assert.equal("id" in payload, false);
  assert.equal("currency" in payload && payload.currency, "PKR");
  assert.equal(payload.price, "25000000.00");
  assert.equal(payload.area, 2400);
  assert.equal(payload.bedrooms, 3);
  assert.equal(payload.published, true);
  assert.equal(payload.assigned_agent_id, "agent-1");
});

test("property updates never send immutable currency or image fields", () => {
  const data = propertyForm();
  data.set("currency", "USD");
  data.set("images", "not-an-upload");
  data.delete("published");
  data.set("assigned_agent_id", "");
  const payload = propertyPayload(data, false);
  assert.equal("currency" in payload, false);
  assert.equal("images" in payload, false);
  assert.equal(payload.published, false);
  assert.equal(payload.assigned_agent_id, null);
});

test("agent creation enforces the backend's twelve-character password policy", () => {
  assert.equal(AGENT_PASSWORD_MIN_LENGTH, 12);
  const data = new FormData();
  data.set("full_name", " Agent Name ");
  data.set("email", " agent@example.com ");
  data.set("role", "admin");
  data.set("password", "short-pass");
  assert.throws(() => agentPayload(data), /at least 12 characters/);
  data.set("password", "long-pass-12!");
  assert.deepEqual(agentPayload(data), {
    full_name: "Agent Name", email: "agent@example.com", role: "agent", password: "long-pass-12!",
  });
  data.set("password", "🔑".repeat(19));
  assert.throws(() => agentPayload(data), /72 UTF-8 bytes/);
});
