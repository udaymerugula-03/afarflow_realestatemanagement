import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Link from "../components/link";
import { api, json } from "../lib/api";
import type { PublicProperty } from "../lib/types";
import { label, money } from "../lib/utils";
import { Alert, Footer, Loading, PublicHeader, Scene } from "../components/ui";
export default function PropertyDetail() {
  const { id = "" } = useParams<{ id: string }>(); const [property, setProperty] = useState<PublicProperty | null>(null);
  const [error, setError] = useState(""); const [formError, setFormError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false); const [active, setActive] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setProperty(null); setError(""); setActive(0); setSuccess(""); setFormError("");
    api<PublicProperty>(`/public/properties/${encodeURIComponent(id)}`, { signal: controller.signal }, false).then(setProperty).catch((error) => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [id]);
  async function inquire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setFormError(""); setSuccess("");
    try {
      const result = await api<{ id: string; message: string }>("/public/inquiries", json("POST", { property_id: id, name: data.get("name"), email: data.get("email"), phone: data.get("phone"), message: data.get("message"), consent: true, website: data.get("website") }), false);
      setSuccess(result.message); form.reset();
    } catch (error) { setFormError((error as Error).message); } finally { setBusy(false); }
  }
  return <><PublicHeader /><main className="container section"><Link href="/properties" className="text-link">← Back to properties</Link><Alert error={error} />{!property && !error ? <Loading /> : property && <><div className="detail-heading"><div><p className="eyebrow">{property.reference_code} · FOR {property.purpose.toUpperCase()}</p><h1 className="page-title">{property.title}</h1><p className="muted">{property.address}, {property.locality}, {property.city}</p></div><div><h2>{money(property.price)}</h2><span className="badge">{label(property.status)}</span></div></div><div className="detail-layout"><div>
    <div className="detail-image">{property.images[active] ? <img src={property.images[active]} alt={`${property.title} — photo ${active + 1}`} /> : <Scene type={property.type} />}</div>
    {(!property.images[active] || property.images[active].includes("/demo-media/")) && <p className="fine-print">Sample stock photograph for demonstration, not the actual listed property or evidence of its location.</p>}
    {property.images.length > 1 && <div className="thumbnails">{property.images.map((image, index) => <button key={`${image}-${index}`} aria-label={`View photo ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)}><img src={image} alt="" /></button>)}</div>}<div className="spec-panel"><div><strong>{property.bedrooms}</strong>Bedrooms</div><div><strong>{property.bathrooms}</strong>Bathrooms</div><div><strong>{property.area}</strong>{property.area_unit}</div><div><strong>{property.type}</strong>Property type</div></div><h2>A closer look</h2><p className="description">{property.description}</p></div><aside className="panel inquiry-panel"><p className="eyebrow">LET’S MAKE A CONNECTION</p><h2>Could this be your place?</h2><p className="muted">Send an inquiry to the listing team. They’ll help you take the next step.</p><form onSubmit={inquire} className="stack"><label>Your name<input name="name" autoComplete="name" required maxLength={150} /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required maxLength={40} /></label><label>Your message<textarea name="message" rows={4} required defaultValue="I’d like to know more about this property." /></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><label className="checkbox"><input type="checkbox" required />I agree to be contacted about this inquiry and to share these details with the listing agency.</label><Alert error={formError} />{success && <div className="success" role="status">{success}</div>}<button disabled={busy}>{busy ? "Sending…" : "Send inquiry ↗"}</button></form></aside></div></>}</main><Footer /></>;
}
