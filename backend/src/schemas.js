import { z } from "zod";

const text = (max = 200) => z.string().trim().min(1).max(max);
export const id = z.string().uuid();
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72,
  "Password must not exceed 72 UTF-8 bytes");
const money = z.union([z.string(), z.number().finite()]).transform(String)
  .refine((value) => /^\d{1,14}(\.\d{1,2})?$/.test(value), "Enter a non-negative amount with at most two decimal places");
const datetime = z.string().datetime({ offset: true });
export const stages = {
  property: ["draft", "available", "reserved", "sold", "rented", "inactive"],
  lead: ["new", "contacted", "qualified", "visit_scheduled", "negotiation", "converted", "lost"],
  visit: ["requested", "confirmed", "completed", "cancelled", "no_show"],
  deal: ["inquiry", "qualified", "visit", "offer", "negotiation", "booking", "documentation", "closed_won", "closed_lost"],
};
export const login = z.object({ email, password }).strict();
export const userCreate = login.extend({
  full_name: text(150),
  password: password.refine((value) => value.length >= 12, "Password must contain at least 12 characters"),
  role: z.literal("agent").default("agent"),
}).strict();
const propertyFields = {
  reference_code: text(60), title: text(), description: text(10000),
  purpose: z.enum(["sale", "rent"]), type: text(60), price: money,
  currency: z.literal("PKR").default("PKR"),
  area: z.number().finite().positive().max(1e9), area_unit: z.enum(["sq ft", "sq yd", "sq m", "acre", "cent", "marla", "kanal"]),
  bedrooms: z.number().int().min(0).max(100).default(0), bathrooms: z.number().int().min(0).max(100).default(0),
  address: text(300), city: text(100), locality: z.string().trim().max(150).default(""),
  status: z.enum(stages.property).default("draft"), published: z.boolean().default(false),
  assigned_agent_id: id.nullable().optional(),
};
export const propertyCreate = z.object(propertyFields).strict();
export const propertyPatch = propertyCreate.omit({ currency: true }).partial().strict();
export const inquiry = z.object({
  property_id: id, name: z.string().trim().min(2).max(150), email,
  phone: z.string().trim().max(30).transform((value) => value.replace(/[\s().-]/g, ""))
    .refine((value) => /^\+?\d{7,15}$/.test(value), "Enter a valid phone number"),
  message: text(5000), consent: z.literal(true), website: z.string().max(0).optional(),
}).strict();
export const leadCreate = inquiry.extend({
  consent: z.literal(true).default(true), assigned_agent_id: id.nullable().optional(),
}).strict();
export const leadPatch = inquiry.pick({ name: true, email: true, phone: true, message: true }).partial().extend({
  stage: z.enum(stages.lead).optional(), assigned_agent_id: id.nullable().optional(),
  next_follow_up_at: datetime.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Supply at least one lead field");
export const note = z.object({ body: text(5000) }).strict();
const linked = { lead_id: id, property_id: id, agent_id: id };
export const visitCreate = z.object({
  ...linked, starts_at: datetime, ends_at: datetime, status: z.enum(["requested", "confirmed"]).default("confirmed"),
  notes: z.string().trim().max(5000).default(""),
}).strict().refine((value) => new Date(value.starts_at) > new Date() && new Date(value.ends_at) > new Date(value.starts_at),
  { message: "Choose a future start and an end after the start", path: ["starts_at"] });
export const visitPatch = z.object({
  status: z.enum(stages.visit), notes: z.string().trim().max(5000).optional(),
}).strict();
export const dealCreate = z.object({
  ...linked, stage: z.enum(stages.deal).default("inquiry"), offer_amount: money,
  notes: z.string().trim().max(5000).default(""),
}).strict();
export const dealPatch = dealCreate.pick({ stage: true, offer_amount: true, notes: true }).partial().strict();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(12),
});
export const propertyFilters = pagination.extend({
  q: z.string().max(200).default(""), city: z.string().max(100).default(""),
  purpose: z.string().max(20).default(""), type: z.string().max(60).default(""),
  min_price: z.coerce.number().finite().nonnegative().optional(), max_price: z.coerce.number().finite().nonnegative().optional(),
  bedrooms: z.coerce.number().int().min(0).max(100).optional(),
});
