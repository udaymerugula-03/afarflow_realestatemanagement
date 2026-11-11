import Link from "./link";
import { useAuth } from "./auth";
import { money } from "../lib/utils";
import type { PublicProperty } from "../lib/types";
import { demoImage } from "../lib/api";

export function Brand() { return <Link href="/" className="brand"><span className="brand-mark">a<span>f</span></span>Aqar<span>Flow</span><small>REAL ESTATE, CONNECTED</small></Link>; }
export function PublicHeader() {
  const { user } = useAuth();
  return <header className="public-header"><div className="container header-inner"><Brand /><nav aria-label="Main navigation"><Link href="/properties">Explore properties</Link><Link href="/contact">Contact</Link><Link className="button small" href={user ? "/workspace" : "/login"}>{user ? "Workspace ↗" : "Agent sign in ↗"}</Link></nav></div></header>;
}
export function Footer() { return <footer><div className="container footer-inner"><Brand /><p>Better spaces. Stronger connections.<br /><span>Your next chapter starts here.</span></p><Link href="/properties">Find a property ↗</Link><Link href="/contact">Get in touch ↗</Link></div><div className="container copyright">© {new Date().getFullYear()} AqarFlow. A considered approach to real estate.</div></footer>; }
export function Alert({ error }: { error: string }) { return error ? <div role="alert" className="alert">{error}</div> : null; }
export function Loading() { return <div className="loading" role="status"><span className="spinner" /> Loading your space…</div>; }
export function Empty({ title = "Nothing here yet", children }: { title?: string; children?: React.ReactNode }) { return <div className="empty"><span className="empty-icon">⌂</span><h3>{title}</h3><p>{children || "Records will appear here when they are available."}</p></div>; }
export function Scene({ small = false, type = "house" }: { small?: boolean; type?: string }) {
  const category = type.toLowerCase();
  const image = ["apartment", "flat"].includes(category) ? "apartment"
    : ["plot", "land"].includes(category) ? "plot"
    : ["commercial", "office", "shop"].includes(category) ? "neighborhood" : "villa";
  return <img className={`scene ${small ? "scene-small" : ""}`} src={demoImage(`${image}.jpg`)} alt={`Sample ${category} photograph, not the actual listed property`} loading={small ? "lazy" : "eager"} />;
}
export function PropertyCard({ property }: { property: PublicProperty }) {
  return <Link className="property-card" href={`/properties/${property.id}`}><div className="property-image">{property.images[0] ? <img src={property.images[0]} alt={property.title} loading="lazy" /> : <Scene small type={property.type} />}<span className="image-tag">For {property.purpose}</span><span className="image-ref">{property.reference_code}</span>{(!property.images[0] || property.images[0].includes("/demo-media/")) && <span className="sample-photo-tag">Sample photo</span>}</div><div className="property-content"><p className="eyebrow">{property.type} · {property.city}</p><h3>{property.title}</h3><p className="muted">{property.locality || property.address}</p><div className="property-specs"><span>{property.bedrooms} beds</span><span>{property.bathrooms} baths</span><span>{property.area} {property.area_unit}</span></div><div className="property-price">{money(property.price)}<span>View home ↗</span></div></div></Link>;
}
export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  return <div className="pagination"><span>{total} result{total === 1 ? "" : "s"} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span><button className="secondary small" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Previous</button><button className="secondary small" disabled={page * pageSize >= total} onClick={() => onChange(page + 1)}>Next →</button></div>;
}
