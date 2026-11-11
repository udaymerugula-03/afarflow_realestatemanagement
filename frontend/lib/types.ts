export type User = { id: string; agency_id: string; full_name: string; email: string; role: "admin" | "agent" };
export type Property = {
  id: string; agency_id: string; reference_code: string; title: string; description: string;
  purpose: "sale" | "rent"; type: string; price: string; currency: "PKR"; area: number;
  area_unit: "sq ft" | "sq yd" | "sq m" | "acre" | "cent" | "marla" | "kanal"; bedrooms: number; bathrooms: number;
  address: string; city: string; locality: string; status: "draft" | "available" | "reserved" | "sold" | "rented" | "inactive";
  published: boolean; assigned_agent_id: string | null; images: string[]; created_at: string;
};
export type PublicProperty = Omit<Property, "agency_id" | "assigned_agent_id">;
export type PropertyCreate = Omit<Property, "id" | "agency_id" | "images" | "created_at">;
export type PropertyUpdate = Partial<Omit<PropertyCreate, "currency">>;
export type Activity = { id: string; body: string; created_at: string; actor_id: string | null };
export type PropertyHistoryEntry = { id: string; action: string; details: unknown; created_at: string; actor_id: string | null };
export type Lead = {
  id: string; agency_id: string; property_id: string; name: string; email: string; phone: string;
  message: string; stage: string; assigned_agent_id: string | null; next_follow_up_at: string | null;
  created_at: string; activities: Activity[];
};
export type Visit = { id: string; agency_id: string; lead_id: string; property_id: string; agent_id: string; starts_at: string; ends_at: string; notes: string; status: string; created_at: string };
export type Deal = { id: string; agency_id: string; lead_id: string; property_id: string; agent_id: string; stage: string; offer_amount: string; notes: string; created_at: string };
export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type Dashboard = { published_properties: number; available_properties: number; new_leads: number; upcoming_visits: number; open_deals: number; total_leads: number };
