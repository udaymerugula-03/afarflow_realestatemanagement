import test from "node:test";
import assert from "node:assert/strict";
import { propertyAction, propertyChanges } from "../lib/property-history.ts";

test("property history names only known property actions", () => {
  assert.equal(propertyAction("property.created"), "Property created");
  assert.equal(propertyAction("property.updated"), "Property updated");
  assert.equal(propertyAction("property.archived"), "Property archived");
  assert.equal(propertyAction("property.image_uploaded"), "Property photo uploaded");
  assert.equal(propertyAction("lead.updated"), "Property activity");
  assert.equal(propertyAction("constructor"), "Property activity");
});
test("property history renders safe status and publication before/after changes", () => {
  assert.deepEqual(propertyChanges({
    before: { status: "draft", published: false, assigned_agent_id: null, title: "First title", secret: "hidden" },
    after: { status: "available", published: true, assigned_agent_id: "agent-1", title: "Next title", secret: "changed" },
  }), ["Status: Draft to Available", "Publication: Unpublished to Published", "Assigned agent: Unassigned to Assigned", "Title updated"]);
  assert.deepEqual(propertyChanges({ before: { assigned_agent_id: "agent-1" }, after: { assigned_agent_id: "agent-2" } }), ["Assigned agent changed"]);
});
test("legacy history details keep useful labels without dumping arbitrary data", () => {
  assert.deepEqual(propertyChanges({ status: "reserved", published: false, fields: ["status", "published", "price", "secret", "price"], secret: "hidden" }),
    ["Status: Reserved", "Publication: Unpublished", "Updated fields: Status, Publication, Price"]);
});
test("creation snapshots show initial status, publication, and assignment without exposing IDs", () => {
  assert.deepEqual(propertyChanges({
    after: { status: "available", published: true, assigned_agent_id: "agent-private-id", agency_id: "agency-private-id" },
  }), ["Status: Available", "Publication: Published", "Assigned agent: Assigned"]);
});
test("empty, malformed, and unrecognized history values are safe", () => {
  for (const details of [null, undefined, [], "raw text", {}, { before: null, after: [] }, { status: { secret: true }, fields: ["secret", null] }]) {
    assert.deepEqual(propertyChanges(details), []);
  }
});
