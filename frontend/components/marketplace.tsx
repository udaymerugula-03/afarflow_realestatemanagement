import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Page, PublicProperty } from "../lib/types";
import { Alert, Empty, Loading, Pagination, PropertyCard } from "./ui";
export function Marketplace({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<PublicProperty> | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const pageSize = compact ? 6 : 12;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api<Page<PublicProperty>>(`/public/properties?${query}&page=${page}&page_size=${pageSize}`, { signal: controller.signal }, false)
      .then(setData).catch((error) => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, pageSize, retry]);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const params = new URLSearchParams();
    form.forEach((value, key) => { if (String(value).trim()) params.set(key, String(value).trim()); });
    const min = Number(form.get("min_price")), max = Number(form.get("max_price"));
    if (form.get("max_price") && min > max) { setError("Minimum price cannot exceed maximum price."); return; }
    setPage(1); setQuery(params.toString()); setRetry((value) => value + 1);
  }
  return <>
    <form className="filter-panel" onSubmit={filter}>
      <div className="filter-grid">
        <label className="search-field">Search<input name="q" maxLength={200} placeholder="A neighborhood, a home, a new start…" /></label>
        <label>City<input name="city" maxLength={100} placeholder="Lahore, Islamabad, Karachi..." /></label>
        <label>Purpose<select name="purpose"><option value="">Buy or rent</option><option value="sale">Buy</option><option value="rent">Rent</option></select></label>
        <button type="submit">Find a property ↗</button>
      </div>
      <details>
        <summary>More filters</summary>
        <div className="form-grid">
          <label>Property type<select name="type"><option value="">All types</option><option value="house">House</option><option value="apartment">Apartment</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label>
          <label>Minimum price (PKR)<input name="min_price" type="number" min="0" step="0.01" placeholder="No minimum" /></label>
          <label>Maximum price (PKR)<input name="max_price" type="number" min="0" step="0.01" placeholder="No maximum" /></label>
          <label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" placeholder="Any" /></label>
        </div>
      </details>
    </form>
    <Alert error={error} />
    {error && <button className="secondary small" onClick={() => setRetry((value) => value + 1)}>Retry connection</button>}
    {loading ? <Loading /> : !error && data && <>
      {data.items.length ? <div className="property-grid">{data.items.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <Empty title="Your next place is still out there">Try a different city or broaden your filters.</Empty>}
      <Pagination page={page} total={data.total} pageSize={pageSize} onChange={setPage} />
    </>}
  </>;
}
