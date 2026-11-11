import type { PropertyCreate, PropertyUpdate } from "./types.ts";

export const AGENT_PASSWORD_MIN_LENGTH = 12;
export const ASSIGNED_RECORD_LIMIT = 500;

export function canCreateDeal(stage: string | null | undefined): boolean {
  return stage === "qualified" || stage === "visit_scheduled" || stage === "negotiation";
}

export function propertyPayload(data: FormData, creating: boolean): PropertyCreate | PropertyUpdate {
  const text = (field: string) => String(data.get(field) ?? "").trim();
  const payload: PropertyUpdate = {
    reference_code: text("reference_code"),
    title: text("title"),
    description: text("description"),
    purpose: text("purpose") as PropertyCreate["purpose"],
    type: text("type"),
    price: text("price"),
    area: Number(data.get("area")),
    area_unit: text("area_unit") as PropertyCreate["area_unit"],
    bedrooms: Number(data.get("bedrooms")),
    bathrooms: Number(data.get("bathrooms")),
    address: text("address"),
    city: text("city"),
    locality: text("locality"),
    status: text("status") as PropertyCreate["status"],
    assigned_agent_id: text("assigned_agent_id") || null,
    published: data.get("published") === "on",
  };
  return creating ? { ...payload, currency: "PKR" } as PropertyCreate : payload;
}

export function agentPayload(data: FormData) {
  const password = String(data.get("password") ?? "");
  if (password.length < AGENT_PASSWORD_MIN_LENGTH) {
    throw new Error(`Use at least ${AGENT_PASSWORD_MIN_LENGTH} characters for the initial password.`);
  }
  if (new TextEncoder().encode(password).length > 72) {
    throw new Error("The initial password must not exceed 72 UTF-8 bytes.");
  }
  return {
    full_name: String(data.get("full_name") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    password,
    role: "agent" as const,
  };
}
