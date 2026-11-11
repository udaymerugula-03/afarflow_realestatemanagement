import { label } from "./utils.ts";

const fieldLabels: Record<string, string> = {
  status: "Status", published: "Publication", assigned_agent_id: "Assigned agent",
  title: "Title", description: "Description", reference_code: "Reference code",
  purpose: "Purpose", type: "Property type", price: "Price", area: "Area", area_unit: "Area unit",
  bedrooms: "Bedrooms", bathrooms: "Bathrooms", address: "Address", city: "City", locality: "Locality",
};
const actions: Record<string, string> = {
  "property.created": "Property created",
  "property.updated": "Property updated",
  "property.archived": "Property archived",
  "property.image_uploaded": "Property photo uploaded",
};
const statuses = ["draft", "available", "reserved", "sold", "rented", "inactive"];
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function status(value: unknown) {
  return typeof value === "string" && statuses.includes(value) ? label(value) : null;
}
export function propertyAction(action: string) { return Object.hasOwn(actions, action) ? actions[action] : "Property activity"; }

export function propertyChanges(details: unknown): string[] {
  const data = record(details), before = record(data.before), after = record(data.after);
  const changes: string[] = [];
  for (const [field, name] of Object.entries(fieldLabels)) {
    if (!(field in before) || !(field in after) || before[field] === after[field]) continue;
    if (field === "status") {
      const oldStatus = status(before[field]), newStatus = status(after[field]);
      if (oldStatus && newStatus) changes.push(`${name}: ${oldStatus} to ${newStatus}`);
    } else if (field === "published" && typeof before[field] === "boolean" && typeof after[field] === "boolean") {
      changes.push(`${name}: ${before[field] ? "Published" : "Unpublished"} to ${after[field] ? "Published" : "Unpublished"}`);
    } else if (field === "assigned_agent_id") {
      changes.push(before[field] && after[field] ? "Assigned agent changed" : `${name}: ${before[field] ? "Assigned" : "Unassigned"} to ${after[field] ? "Assigned" : "Unassigned"}`);
    } else if (field !== "published") {
      changes.push(`${name} updated`);
    }
  }
  if (!changes.length) {
    const snapshot = !Object.keys(before).length && Object.keys(after).length ? after : data;
    const currentStatus = status(snapshot.status);
    if (currentStatus) changes.push(`Status: ${currentStatus}`);
    if (typeof snapshot.published === "boolean") changes.push(`Publication: ${snapshot.published ? "Published" : "Unpublished"}`);
    if (snapshot === after && Object.hasOwn(snapshot, "assigned_agent_id")) {
      changes.push(`Assigned agent: ${snapshot.assigned_agent_id ? "Assigned" : "Unassigned"}`);
    }
    if (Array.isArray(data.fields)) {
      const fields = [...new Set(data.fields.filter((field): field is string => typeof field === "string" && Object.hasOwn(fieldLabels, field)))];
      if (fields.length) changes.push(`Updated fields: ${fields.map((field) => fieldLabels[field]).join(", ")}`);
    }
  }
  return changes;
}
