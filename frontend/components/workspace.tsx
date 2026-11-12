import Link from "./link";
import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { Alert, Brand, Loading } from "./ui";
import { api } from "../lib/api";
import type { Dashboard } from "../lib/types";
import { label } from "../lib/utils";
import "../workspace-redesign.css";

type WorkspaceIconName = "overview" | "property" | "leads" | "visits" | "deals" | "team" | "arrow" | "logout" | "check" | "refresh" | "globe" | "shield";
function WorkspaceIcon({ name, size = 20 }: { name: WorkspaceIconName; size?: number }) {
  const paths: Record<WorkspaceIconName, string> = {
    overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    property: "M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-7h6v7 M9 9h.01 M15 9h.01",
    leads: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z M8 11h8 M8 15h5",
    visits: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 14h2 M14 14h2 M8 18h2",
    deals: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z M3 11l9 4 9-4 M12 12v5",
    team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    logout: "M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4",
    check: "M5 12l4 4L19 6",
    refresh: "M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 3l1 3 M4 12l1 3a8 8 0 0 0 13 3",
    globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M3 12h18 M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z",
    shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z M8 12l3 3 5-6",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

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
const links: { path: string; icon: WorkspaceIconName; name: string }[] = [
  { path: "", icon: "overview", name: "Overview" },
  { path: "/properties", icon: "property", name: "Properties" },
  { path: "/leads", icon: "leads", name: "Lead inbox" },
  { path: "/visits", icon: "visits", name: "Visits" },
  { path: "/deals", icon: "deals", name: "Deals" },
  { path: "/staff", icon: "team", name: "Team" },
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, logout } = useAuth(); const { pathname } = useLocation(); const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(""); const [busy, setBusy] = useState(false);
  if (loading) return <div className="session-gate"><Brand /><Loading /></div>;
  if (!user) return <div className="session-gate"><Brand /><span className="session-symbol"><WorkspaceIcon name="shield" size={30} /></span><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>Your workspace awaits.</h1><p>Sign in with your agency account to pick up where you left off.</p><Alert error={error || logoutError} /><Link className="button" href="/login">Sign in <WorkspaceIcon name="arrow" size={17} /></Link>{error && <button className="secondary" onClick={() => void refresh()}>Retry session check</button>}</div>;
  async function signOut() {
    setBusy(true); setLogoutError("");
    try { await logout(); navigate("/login", { replace: true }); }
    catch (error) { setLogoutError(`Signed out locally, but server revocation failed: ${(error as Error).message}`); }
    finally { setBusy(false); }
  }
  const currentPage = links.find(({ path }) => path && pathname.startsWith(`/workspace${path}`))?.name || "Overview";
  const initials = user.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return <div className="workspace">
    <a className="workspace-skip" href="#workspace-content">Skip to workspace content</a>
    <aside className="sidebar">
      <Brand />
      <div className="workspace-agency"><span className="agency-monogram"><WorkspaceIcon name="property" size={19} /></span><div><strong>Agency workspace</strong><small>Real estate, connected</small></div><span className="agency-indicator" /></div>
      <p className="sidebar-label">WORKSPACE</p>
      <nav aria-label="Workspace">{links.filter(({ path }) => path !== "/staff" || user.role === "admin").map(({ path, icon, name }) => {
        const active = path ? pathname.startsWith(`/workspace${path}`) : pathname === "/workspace";
        return <Link key={path} href={`/workspace${path}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><WorkspaceIcon name={icon} /><span>{name}</span>{active && <span className="nav-active-dot" />}</Link>;
      })}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><WorkspaceIcon name="shield" size={19} /><p>A space for your agency.<br /><span>Connected by AqarFlow.</span></p></div>
        <Link className="marketplace-link" href="/properties"><WorkspaceIcon name="globe" size={17} />View marketplace<WorkspaceIcon name="arrow" size={16} /></Link>
        <div className="user-card"><span className="avatar">{initials}</span><div><strong title={user.full_name}>{user.full_name}</strong><small>{label(user.role)} account</small></div></div>
        <button className="secondary small workspace-signout" disabled={busy} onClick={signOut}><WorkspaceIcon name="logout" size={17} />{busy ? "Signing out…" : "Sign out"}</button>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header"><div className="workspace-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{currentPage}</strong></div><div className="workspace-header-identity"><span className="workspace-role"><WorkspaceIcon name="shield" size={14} />{user.role === "admin" ? "Administrator" : "Agent"}</span><span className="header-avatar" aria-hidden="true">{initials}</span></div></header>
      <main className="workspace-main" id="workspace-content" tabIndex={-1}><Alert error={logoutError} />{children}</main>
    </div>
  </div>;
}
export function WorkspaceHeading({ eyebrow = "YOUR WORKSPACE", title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="workspace-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}

const metrics: { key: keyof Dashboard; title: string; description: string; icon: WorkspaceIconName; href: string; tone: string; property?: boolean }[] = [
  { key: "published_properties", title: "Published properties", description: "Public listings · available or reserved", icon: "globe", href: "/workspace/properties", tone: "blue", property: true },
  { key: "available_properties", title: "Available properties", description: "Available inventory · published or not", icon: "property", href: "/workspace/properties", tone: "teal", property: true },
  { key: "new_leads", title: "New leads", description: "Conversations in the New stage", icon: "leads", href: "/workspace/leads", tone: "amber" },
  { key: "total_leads", title: "Total leads", description: "All conversations · every stage", icon: "team", href: "/workspace/leads", tone: "violet" },
  { key: "upcoming_visits", title: "Upcoming visits", description: "Future visits · requested or confirmed", icon: "visits", href: "/workspace/visits", tone: "blue" },
  { key: "open_deals", title: "Open deals", description: "Active deals · excludes won and lost", icon: "deals", href: "/workspace/deals", tone: "teal" },
];

export function DashboardView() {
  const { user } = useAuth(); const resource = useResource<Dashboard>("/reports/dashboard");
  const isAdmin = user?.role === "admin";
  const shortcuts: { icon: WorkspaceIconName; title: string; description: string; href: string }[] = [
    { icon: "property", title: "Manage properties", description: "Keep listing details and availability current.", href: "/workspace/properties" },
    { icon: "visits", title: "Coordinate a visit", description: "Arrange the next viewing with your lead.", href: "/workspace/visits" },
    { icon: "deals", title: "Move a deal forward", description: "Review stages, offers, and next steps.", href: "/workspace/deals" },
  ];
  return <>
    <WorkspaceHeading eyebrow="THE BIG PICTURE" title="Overview dashboard" description={`Welcome back, ${user?.full_name.trim().split(/\s+/)[0] || "team"}. Let's make the next move count.`} action={<Link className="button" href="/workspace/leads"><WorkspaceIcon name="leads" size={17} />Open lead inbox<WorkspaceIcon name="arrow" size={16} /></Link>} />
    <div className="dashboard-context"><span><span className="context-marker" />{isAdmin ? "Agency-wide overview" : "Your assigned work + agency inventory"}</span><button className="dashboard-refresh" disabled={resource.loading} onClick={resource.reload}><WorkspaceIcon name="refresh" size={15} />{resource.loading ? "Refreshing…" : "Refresh counts"}</button></div>
    <ResourceState {...resource} />
    {resource.data && <div className="stats-grid">{metrics.map((metric) => <Link className={`stat-card stat-${metric.tone}`} href={metric.href} key={metric.key}>
      <div className="stat-top"><span className="stat-icon"><WorkspaceIcon name={metric.icon} size={21} /></span><span className="stat-scope">{isAdmin || metric.property ? "AGENCY" : "ASSIGNED TO YOU"}</span></div>
      <span className="stat-label">{metric.title}</span><strong>{resource.data![metric.key].toLocaleString()}</strong><p className="stat-description">{metric.description}</p><span className="stat-foot"><span>View {metric.property ? "properties" : metric.key.includes("leads") ? "leads" : metric.key === "upcoming_visits" ? "visits" : "deals"}</span><WorkspaceIcon name="arrow" size={15} /></span>
    </Link>)}</div>}
    <div className="workspace-two dashboard-actions">
      <section className="panel next-move-panel"><div className="panel-kicker"><span className="feature-icon"><WorkspaceIcon name="leads" size={23} /></span><span className="eyebrow">RELATIONSHIPS FIRST</span></div><h2>Great moves start with<br />a conversation.</h2><p>Give every inquiry a clear next step. Review new leads, capture the details, and keep your follow-ups moving.</p><Link className="button" href="/workspace/leads">Find your next conversation<WorkspaceIcon name="arrow" size={17} /></Link><div className="feature-foot"><WorkspaceIcon name="check" size={16} /><span>{isAdmin ? "A shared view of your agency's conversations" : "Focused on the leads assigned to you"}</span></div></section>
      <section className="panel shortcuts-panel"><div className="section-title"><div><p className="eyebrow">FROM HERE TO WHAT'S NEXT</p><h2>Your daily toolkit</h2></div><span className="toolkit-icon"><WorkspaceIcon name="overview" size={20} /></span></div><div className="quick-links">{shortcuts.map((shortcut) => <Link key={shortcut.href} href={shortcut.href}><span className="shortcut-icon"><WorkspaceIcon name={shortcut.icon} size={20} /></span><div><strong>{shortcut.title}</strong><small>{shortcut.description}</small></div><WorkspaceIcon name="arrow" size={17} /></Link>)}</div></section>
    </div>
    <section className="panel workspace-guide"><div className="guide-intro"><p className="eyebrow">A LITTLE STRUCTURE. A BETTER WORKDAY.</p><h2>Keep every opportunity in flow.</h2><p className="muted">A simple rhythm for your team, from first hello to the final handover.</p></div><ol><li><span>01</span><div><strong>Connect with intent</strong><p>Review the lead's requirements and leave a useful note.</p></div></li><li><span>02</span><div><strong>Make the next step clear</strong><p>Set a follow-up or coordinate a property viewing.</p></div></li><li><span>03</span><div><strong>Keep the record current</strong><p>Update deal stages and property availability as things change.</p></div></li></ol></section>
    <div className="workspace-scope-note"><WorkspaceIcon name="shield" size={18} /><p><strong>{isAdmin ? "Your agency, in one place." : "Built around your role."}</strong> {isAdmin ? "All six counts cover your agency." : "Property counts cover the agency. Lead, visit, and deal counts cover only records assigned to you."} Counts are a snapshot; refresh for the latest figures.</p>{isAdmin && <Link href="/workspace/staff">Manage team<WorkspaceIcon name="arrow" size={15} /></Link>}</div>
  </>;
}
