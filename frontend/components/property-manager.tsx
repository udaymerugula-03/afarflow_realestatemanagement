import Link from "./link";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { api, json } from "../lib/api";
import { propertyPayload } from "../lib/forms";
import type { Page, Property, User } from "../lib/types";
import { label, money } from "../lib/utils";
import { Alert, Empty, Pagination, Scene } from "./ui";
import { ResourceState, useResource, WorkspaceHeading } from "./workspace";
import { PropertyHistory } from "./property-history";
const maxImageMb = import.meta.env.VITE_MAX_IMAGE_MB === "4" ? 4 : 5;

export function PropertyList() {
  const { user } = useAuth(); const [page, setPage] = useState(1); const [query, setQuery] = useState("");
  const resource = useResource<Page<Property>>(`/properties?page=${page}&page_size=12&${query}`);
  function filter(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const params = new URLSearchParams(); data.forEach((value, key) => { if (value) params.set(key, String(value)); }); setPage(1); setQuery(params.toString()); }
  return <><WorkspaceHeading title="Properties" description="One clear view of the spaces in your portfolio." action={user?.role === "admin" && <Link className="button" href="/workspace/properties/new">+ Add property</Link>} /><form className="toolbar" onSubmit={filter}><input aria-label="Search properties" name="q" placeholder="Search title or reference…" /><input aria-label="City" name="city" placeholder="City" /><select aria-label="Purpose" name="purpose"><option value="">All purposes</option><option value="sale">Sale</option><option value="rent">Rent</option></select><button>Search</button></form><ResourceState {...resource} />{resource.data && <><div className="table-wrap"><table><thead><tr><th>Property</th><th>Price</th><th>Status</th><th>Visibility</th><th /></tr></thead><tbody>{resource.data.items.map((property) => <tr key={property.id}><td><strong>{property.title}</strong><small>{property.reference_code} · {property.city}</small></td><td>{money(property.price)}</td><td><span className={`badge ${property.status}`}>{label(property.status)}</span></td><td>{property.published ? "Published" : "Private"}</td><td><Link className="text-link" href={`/workspace/properties/${property.id}`}>{user?.role === "admin" ? "Manage →" : "View →"}</Link></td></tr>)}</tbody></table>{!resource.data.items.length && <Empty title="No properties found" />}</div><Pagination page={page} total={resource.data.total} pageSize={12} onChange={setPage} /></>}</>;
}
export function PropertyEditor({ id }: { id: string }) {
  const { user } = useAuth(); const isNew = id === "new";
  if (isNew && user?.role !== "admin") return <Alert error="Only administrators can create properties." />;
  return isNew ? <PropertyForm /> : <ExistingProperty id={id} />;
}
function ExistingProperty({ id }: { id: string }) {
  const { user } = useAuth();
  const resource = useResource<Property>(`/properties/${encodeURIComponent(id)}`);
  const [historyVersion, setHistoryVersion] = useState(0);
  function reload() { setHistoryVersion((version) => version + 1); resource.reload(); }
  return <><ResourceState {...resource} />{resource.data && <>
    {user?.role === "admin" ? <PropertyForm key={`${resource.data.id}-${resource.data.images.length}-${resource.data.published}`} property={resource.data} reload={reload} /> : <PropertyReadOnly property={resource.data} />}
    <PropertyHistory key={`${id}-${historyVersion}`} propertyId={id} />
  </>}</>;
}
function PropertyReadOnly({ property }: { property: Property }) {
  return <><WorkspaceHeading title={property.title} description={`${property.reference_code} · ${property.locality}, ${property.city}`} action={<span className="badge">{label(property.status)}</span>} /><Link href="/workspace/properties" className="text-link">← All properties</Link><section className="panel">
    <div className="detail-image">{property.images[0] ? <img src={property.images[0]} alt={property.title} /> : <Scene type={property.type} />}</div>
    {(!property.images[0] || property.images[0].includes("/demo-media/")) && <p className="fine-print">Sample stock photograph, not the actual listed property.</p>}
    <h2 style={{ marginTop: 24 }}>{money(property.price)}</h2><p className="muted">{property.address}</p><div className="spec-panel"><div><strong>{property.bedrooms}</strong>Bedrooms</div><div><strong>{property.bathrooms}</strong>Bathrooms</div><div><strong>{property.area}</strong>{property.area_unit}</div><div><strong>{property.type}</strong>For {property.purpose}</div></div><p className="description">{property.description}</p><div className="image-grid">{property.images.slice(1).map((image, index) => <img src={image} alt={`Property photo ${index + 2}`} key={`${image}-${index}`} />)}</div><p className="fine-print">{property.published ? "Published on the marketplace." : "Private agency listing."} Contact your administrator for changes to this property.</p></section></>;
}
function PropertyForm({ property, reload }: { property?: Property; reload?: () => void }) {
  const { user } = useAuth(); const navigate = useNavigate(); const staff = useResource<User[]>("/users");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [confirmArchive, setConfirmArchive] = useState(false);
  const [assignedAgentId, setAssignedAgentId] = useState(property?.assigned_agent_id || "");
  const admin = user?.role === "admin";
  const agents = staff.data?.filter((person) => person.role === "agent");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const payload = propertyPayload(data, !property);
    setBusy(true); setError(""); setSuccess("");
    try {
      const saved = await api<Property>(property ? `/properties/${property.id}` : "/properties", json(property ? "PATCH" : "POST", payload));
      setSuccess("Property saved."); if (!property) navigate(`/workspace/properties/${saved.id}`, { replace: true }); else reload?.();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError(""); setSuccess("");
    const file = data.get("file");
    if (file instanceof File && file.size > maxImageMb * 1024 * 1024) { setError(`Upload a photo of at most ${maxImageMb} MB.`); setBusy(false); return; }
    try { await api<Property>(`/properties/${property!.id}/images`, { method: "POST", body: data }); form.reset(); reload?.(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function archive() {
    setBusy(true); setError("");
    try { await api(`/properties/${property!.id}`, json("DELETE")); navigate("/workspace/properties", { replace: true }); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    <WorkspaceHeading title={property ? "Edit property" : "Create property"} description={property ? `${property.title} · Refine, publish, and manage photos for this property.` : "Create, refine, and publish your property. Upload photos after saving."} />
    <Link href="/workspace/properties" className="text-link">← All properties</Link>
    <Alert error={error} />
    {success && <div role="status" className="success">{success}</div>}
    <form onSubmit={save} className="panel stack">
      <fieldset disabled={!admin || busy}>
        <div className="form-grid">
          <label>Title<input name="title" defaultValue={property?.title} required maxLength={200} /></label>
          <label>Reference code<input name="reference_code" defaultValue={property?.reference_code} required maxLength={60} /></label>
          <label>Purpose<select name="purpose" defaultValue={property?.purpose || "sale"}><option value="sale">Sale</option><option value="rent">Rent</option></select></label>
          <label>Type<input name="type" list="property-types" defaultValue={property?.type || "house"} required maxLength={60} /><datalist id="property-types"><option value="house">House</option><option value="apartment">Apartment</option><option value="plot">Plot</option><option value="commercial">Commercial</option></datalist></label>
          <label>Price (PKR)<input name="price" type="number" step="0.01" min="0" max="99999999999999.99" defaultValue={property?.price} required /></label>
          <label>Area<input name="area" type="number" min="0.01" max="1000000000" step="0.01" defaultValue={property?.area} required /></label>
          <label>Area unit<select name="area_unit" defaultValue={property?.area_unit || "marla"}>{["sq ft", "sq yd", "sq m", "acre", "cent", "marla", "kanal"].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" step="1" defaultValue={property?.bedrooms ?? 0} required /></label>
          <label>Bathrooms<input name="bathrooms" type="number" min="0" max="100" step="1" defaultValue={property?.bathrooms ?? 0} required /></label>
          <label>City<input name="city" defaultValue={property?.city} maxLength={100} required /></label>
          <label>Locality<input name="locality" defaultValue={property?.locality} maxLength={150} /></label>
          <label>Address<input name="address" defaultValue={property?.address} maxLength={300} required /></label>
          <label>Status<select name="status" defaultValue={property?.status || "draft"}>{["draft", "available", "reserved", "sold", "rented", "inactive"].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
          <label>Assigned agent<select name="assigned_agent_id" value={assignedAgentId} onChange={(event) => setAssignedAgentId(event.target.value)}>
            <option value="">Unassigned</option>
            {agents?.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
            {property?.assigned_agent_id && !agents?.some((agent) => agent.id === property.assigned_agent_id) && <option value={property.assigned_agent_id}>Current assignment</option>}
          </select></label>
        </div>
        <label>Description<textarea name="description" rows={6} maxLength={10000} defaultValue={property?.description} required /></label>
        <label className="checkbox"><input type="checkbox" name="published" defaultChecked={property?.published} />Publish on the public marketplace</label>
        <p className="fine-print">Only available or reserved properties are visible publicly, even when publishing is enabled.</p>
      </fieldset>
      <Alert error={staff.error} />
      {staff.error && <button className="secondary small" type="button" onClick={staff.reload}>Retry team options</button>}
      {admin && <button disabled={busy}>{busy ? "Saving…" : property ? "Save property" : "Create property"}</button>}
    </form>
    {property && <section className="panel">
      <h2>Property photography</h2>
      <p className="muted">Upload JPEG, PNG or WebP photos up to {maxImageMb} MB. No external image URL is needed.</p>
      <div className="image-grid">{property.images.map((image, index) => <img src={image} alt={`Property photo ${index + 1}`} key={`${image}-${index}`} />)}</div>
      {!property.images.length && <p className="muted">No photos uploaded yet.</p>}
      {admin && <form className="toolbar" onSubmit={upload}>
        <input aria-label="Property photo" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
        <button disabled={busy}>{busy ? "Please wait…" : "Upload photo"}</button>
      </form>}
    </section>}
    {admin && property && <section className="panel danger-zone">
      <h3>Archive property</h3>
      <p>This removes the property from active inventory. The server retains its history.</p>
      {confirmArchive ? <div className="inline-actions"><button className="danger" disabled={busy} onClick={archive}>Confirm archive</button><button className="secondary" onClick={() => setConfirmArchive(false)}>Cancel</button></div> : <button className="secondary" onClick={() => setConfirmArchive(true)}>Archive property</button>}
    </section>}
  </>;
}
