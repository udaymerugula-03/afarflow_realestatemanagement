import Link from "./link";
import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { Alert, Brand, Empty, Loading } from "./ui";
import { api } from "../lib/api";
import type { Dashboard } from "../lib/types";
import { label } from "../lib/utils";

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path) { setData(null); setError(""); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError(""); setData(null);
    api<T>(path, { signal: controller.signal }).then(setData).catch((error) => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, loading, reload };
}
export function ResourceState({ loading, error, reload }: { loading: boolean; error: string; reload: () => void }) {
  return <>{loading && <Loading />}<Alert error={error} />{error && <button className="secondary small" onClick={reload}>Try again</button>}</>;
}
const links = [["", "◫", "Overview"], ["/properties", "⌂", "Properties"], ["/leads", "◉", "Lead inbox"], ["/visits", "▦", "Visits"], ["/deals", "◇", "Deals"], ["/staff", "♧", "Team"]];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, logout } = useAuth(); const { pathname } = useLocation(); const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(""); const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (!user) return <div className="session-gate"><Brand /><h1>Your workspace awaits.</h1><p>Sign in with your agency account to continue.</p><Alert error={error || logoutError} /><Link className="button" href="/login">Sign in →</Link>{error && <button className="secondary" onClick={() => void refresh()}>Retry session check</button>}</div>;
  async function signOut() {
    setBusy(true); setLogoutError("");
    try { await logout(); navigate("/login", { replace: true }); }
    catch (error) { setLogoutError(`Signed out locally, but server revocation failed: ${(error as Error).message}`); }
    finally { setBusy(false); }
  }
  return <div className="workspace"><aside className="sidebar"><Brand /><p className="sidebar-label">YOUR WORKSPACE</p><nav aria-label="Workspace">{links.filter(([path]) => path !== "/staff" || user.role === "admin").map(([path, icon, name]) => <Link key={path} href={`/workspace${path}`} className={(path ? pathname.startsWith(`/workspace${path}`) : pathname === "/workspace") ? "active" : ""}><span>{icon}</span>{name}</Link>)}</nav><div className="sidebar-bottom"><Link href="/properties">View marketplace ↗</Link><div className="user-card"><span className="avatar">{user.full_name.slice(0, 1)}</span><div><strong>{user.full_name}</strong><small>{label(user.role)}</small></div></div><button className="secondary small" disabled={busy} onClick={signOut}>{busy ? "Signing out…" : "Sign out"}</button></div></aside><div className="workspace-body"><header className="workspace-header"><span>Agency workspace <span className="muted">/ {pathname.split("/")[2] ? label(pathname.split("/")[2]) : "Overview"}</span></span><span className="badge">{user.role === "admin" ? "Administrator" : "Agent"}</span></header><main className="workspace-main"><Alert error={logoutError} />{children}</main></div></div>;
}
export function WorkspaceHeading({ eyebrow = "YOUR WORKSPACE", title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="workspace-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}
export function DashboardView() {
  const { user } = useAuth(); const resource = useResource<Dashboard>("/reports/dashboard");
  return <><WorkspaceHeading title="Overview dashboard" description={`Welcome, ${user?.full_name.split(" ")[0] || "team"}. Your business at a glance. Keep every next step in flow.`} /><ResourceState {...resource} />{resource.data && <div className="stats-grid">{Object.entries(resource.data).map(([key, value]) => <div className="stat-card" key={key}><span>{label(key)}</span><strong>{value}</strong><span className="stat-foot">Live agency overview</span></div>)}</div>}<div className="workspace-two"><section className="panel"><p className="eyebrow">KEEP THE MOMENTUM</p><h2>Every conversation counts.</h2><p className="muted">Follow up with new inquiries, leave useful notes, and move opportunities to their next stage.</p><Link className="button" href="/workspace/leads">Open lead inbox →</Link></section><section className="panel"><p className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</p><h2>From first visit to final deal.</h2><div className="quick-links"><Link href="/workspace/visits">Plan a property visit <span>↗</span></Link><Link href="/workspace/deals">Review your deal pipeline <span>↗</span></Link><Link href="/workspace/properties">Explore your inventory <span>↗</span></Link></div></section></div>{user?.role === "agent" && <Empty title="A workspace focused on you">Your agency controls access. Only records assigned to you are returned by the server.</Empty>}</>;
}
