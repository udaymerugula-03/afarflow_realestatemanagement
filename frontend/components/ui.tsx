import Link from "./link";
import { useAuth } from "./auth";
import { money } from "../lib/utils";
import type { PublicProperty } from "../lib/types";
import { demoImage } from "../lib/api";
import { NavLink } from "react-router-dom";
import { Icon } from "./icons";

export function Brand() { return <Link href="/" className="brand" aria-label="AqarFlow home"><span className="brand-mark"><Icon name="home" size={23} /></span>Aqar<span>Flow</span><small>REAL ESTATE, CONNECTED</small></Link>; }
export function PublicHeader() {
  const { user } = useAuth();
  return <><a href="#main-content" className="skip-link">Skip to content</a><header className="public-header"><div className="container header-inner"><Brand /><nav aria-label="Main navigation"><NavLink to="/properties">Explore properties</NavLink><NavLink to="/contact">Contact</NavLink><Link className="button small header-login" href={user ? "/workspace" : "/login"}>{user ? "Workspace" : "Log in"}<Icon name="arrow" size={16} /></Link></nav></div></header></>;
}
export function Footer() { return <footer className="public-footer"><div className="container footer-inner"><div className="footer-about"><Brand /><p>Good places. Better possibilities.<br />Your next chapter starts here.</p><span className="footer-market"><span />Pakistan-first. People-focused.</span></div><div className="footer-links"><span className="eyebrow">DISCOVER</span><Link href="/properties">All properties</Link><Link href="/properties?purpose=sale">Properties for sale</Link><Link href="/properties?purpose=rent">Properties for rent</Link></div><div className="footer-links"><span className="eyebrow">GET CONNECTED</span><Link href="/contact">Contact & inquiries</Link><Link href="/login">Admin / Agent sign in</Link><a href="https://www.vireleo.me" target="_blank" rel="noreferrer">A VIRELEO project <Icon name="arrow" size={14} /></a></div></div><div className="container copyright"><span>© {new Date().getFullYear()} AqarFlow. Real estate, connected.</span><span>Discover. Connect. Move forward.</span></div></footer>; }
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
  return <Link className="property-card" href={`/properties/${property.id}`}><div className="property-image">{property.images[0] ? <img src={property.images[0]} alt={property.title} loading="lazy" /> : <Scene small type={property.type} />}<span className={`image-tag ${property.purpose}`}>For {property.purpose}</span><span className="image-ref">{property.reference_code}</span><span className="card-open"><Icon name="arrow" size={18} /></span></div><div className="property-content"><p className="eyebrow">{property.type} · {property.city}</p><h3>{property.title}</h3><p className="muted card-location"><Icon name="location" size={14} />{property.locality || property.address}</p><div className="property-specs"><span><Icon name="bed" size={16} />{property.bedrooms} beds</span><span><Icon name="bath" size={16} />{property.bathrooms} baths</span><span><Icon name="area" size={16} />{property.area} {property.area_unit}</span></div><div className="property-price"><div>{money(property.price)}{property.purpose === "rent" && <small>Rental listing</small>}</div><span>View details <Icon name="arrow" size={15} /></span></div></div></Link>;
}
export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  return <div className="pagination"><span>{total} result{total === 1 ? "" : "s"} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span><button className="secondary small" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Previous</button><button className="secondary small" disabled={page * pageSize >= total} onClick={() => onChange(page + 1)}>Next →</button></div>;
}
