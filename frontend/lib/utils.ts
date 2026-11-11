export function errorDetail(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || !("detail" in data)) return fallback;
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((entry) => {
    const location = Array.isArray(entry.loc) ? entry.loc.filter((part: unknown) => part !== "body").join(".") : "";
    return `${location ? `${location}: ` : ""}${entry.msg || "Invalid value"}`;
  }).join("; ");
  return fallback;
}
export function money(value: string | number) {
  const amount = Number(value);
  return `PKR ${new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount)}`;
}
export function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function visitInterval(start: string, end: string) {
  const starts = new Date(start), ends = new Date(end);
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime())) throw new Error("Choose a valid start and end time.");
  if (ends <= starts) throw new Error("End time must be after start time.");
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}
export function matchingProperty<T extends { id: string }>(properties: T[], lead?: { property_id: string }) {
  return lead ? properties.filter((property) => property.id === lead.property_id) : [];
}
export function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
