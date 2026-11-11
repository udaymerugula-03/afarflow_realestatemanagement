import test from "node:test";
import assert from "node:assert/strict";
import { errorDetail, matchingProperty, visitInterval, localDate, money } from "../lib/utils.ts";
test("Pakistani rupees use en-PK formatting, a PKR prefix and preserve paisa", () => {
  assert.equal(money("42500000"), "PKR 42,500,000");
  assert.equal(money("85000.50"), "PKR 85,000.50");
  assert.equal(money("0"), "PKR 0");
});
test("REST API string and validation errors remain visible", () => {
  assert.equal(errorDetail({ detail: "Schedule conflict" }, "fallback"), "Schedule conflict");
  assert.equal(errorDetail({ detail: [{ loc: ["body", "email"], msg: "Invalid email" }] }, "fallback"), "email: Invalid email");
  assert.equal(errorDetail(null, "Request failed"), "Request failed");
});
test("visits require a valid interval and send ISO dates", () => {
  assert.throws(() => visitInterval("invalid", "invalid"), /valid start/);
  assert.throws(() => visitInterval("2026-11-10T12:00", "2026-11-10T11:00"), /after/);
  assert.throws(() => visitInterval("2026-11-10T12:00", "2026-11-10T12:00"), /after/);
  const interval = visitInterval("2026-11-10T12:00", "2026-11-10T13:00");
  assert.equal(Date.parse(interval.ends_at) - Date.parse(interval.starts_at), 3600000);
  assert.ok(interval.starts_at.endsWith("Z"));
});
test("workflow property choices only match the selected lead", () => {
  const properties = [{ id: "p1" }, { id: "p2" }];
  assert.deepEqual(matchingProperty(properties), []);
  assert.deepEqual(matchingProperty(properties, { property_id: "p2" }), [{ id: "p2" }]);
  assert.deepEqual(matchingProperty(properties, { property_id: "missing" }), []);
});
test("follow-up dates round-trip through local datetime inputs", () => {
  const source = "2026-11-10T10:30:00.000Z";
  assert.equal(new Date(localDate(source)).toISOString(), source);
  assert.equal(localDate(null), "");
});
