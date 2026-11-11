import Link from "./link";
import { FormEvent, useState } from "react";
import { api, json } from "../lib/api";
import type { Lead, Page, Property, User } from "../lib/types";
import { label, localDate } from "../lib/utils";
import { useAuth } from "./auth";
import { Alert, Empty, Pagination } from "./ui";
import { ResourceState, useResource, WorkspaceHeading } from "./workspace";
export const leadStages = ["new", "contacted", "qualified", "visit_scheduled", "negotiation", "converted", "lost"];
export function LeadList() {
  const [page, setPage] = useState(1); const [query, setQuery] = useState(""); const [creating, setCreating] = useState(false);
  const resource = useResource<Page<Lead>>(`/leads?page=${page}&page_size=15&${query}`);
  function filter(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const params = new URLSearchParams(); data.forEach((value, key) => { if (value) params.set(key, String(value)); }); setQuery(params.toString()); setPage(1); }
  return <><WorkspaceHeading title="Leads" description="Every inquiry, next step, and meaningful connection." action={<button onClick={() => setCreating(!creating)}>{creating ? "Close form" : "+ Add lead"}</button>} />{creating && <LeadCreate onCreated={() => { setCreating(false); resource.reload(); }} />}<form className="toolbar" onSubmit={filter}><input name="q" aria-label="Search leads" placeholder="Search name, email, phone…" /><select name="stage" aria-label="Lead stage"><option value="">All stages</option>{leadStages.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select><button>Filter leads</button></form><ResourceState {...resource} />{resource.data && <><div className="table-wrap"><table><thead><tr><th>Contact</th><th>Stage</th><th>Next follow-up</th><th>Created</th><th /></tr></thead><tbody>{resource.data.items.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><small>{lead.email}</small></td><td><span className={`badge ${lead.stage}`}>{label(lead.stage)}</span></td><td>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : "Not scheduled"}</td><td>{new Date(lead.created_at).toLocaleDateString()}</td><td><Link href={`/workspace/leads/${lead.id}`} className="text-link">Open →</Link></td></tr>)}</tbody></table>{!resource.data.items.length && <Empty title="No matching leads" />}</div><Pagination page={page} pageSize={15} total={resource.data.total} onChange={setPage} /></>}</>;
}
function LeadCreate({ onCreated }: { onCreated: () => void }) {
  const properties = useResource<Page<Property>>("/properties?page=1&page_size=100"); const staff = useResource<User[]>("/users"); const { user } = useAuth();
  const agents = staff.data?.filter((person) => person.role === "agent");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const payload = Object.fromEntries(data.entries()); setBusy(true); setError("");
    try { await api("/leads", json("POST", { ...payload, ...(data.get("assigned_agent_id") ? {} : { assigned_agent_id: user?.role === "agent" ? user.id : null }) })); onCreated(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <form className="panel stack" onSubmit={submit}>
    <h2>Add a conversation</h2>
    <ResourceState {...properties} /><ResourceState {...staff} />
    <div className="form-grid">
      <label>Name<input name="name" minLength={2} maxLength={150} required /></label>
      <label>Email<input name="email" type="email" maxLength={254} required /></label>
      <label>Phone<input name="phone" type="tel" maxLength={30} required /></label>
      <label>Property<select name="property_id" required defaultValue=""><option value="" disabled>Choose a property</option>{properties.data?.items.map((property) => <option key={property.id} value={property.id}>{property.reference_code} · {property.title}</option>)}</select></label>
      {user?.role === "admin" && <label>Assign to<select name="assigned_agent_id"><option value="">Unassigned</option>{agents?.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}</select></label>}
    </div>
    {properties.data && properties.data.total > 100 && <p className="fine-print">Showing the first 100 accessible properties.</p>}
    <label>Message<textarea name="message" rows={3} maxLength={5000} required /></label>
    <Alert error={error} />
    <button disabled={busy || properties.loading || !properties.data}>{busy ? "Creating…" : "Create lead"}</button>
  </form>;
}
export function LeadDetail({ id }: { id: string }) {
  const resource = useResource<Lead>(`/leads/${encodeURIComponent(id)}`);
  const [contactSavedFor, setContactSavedFor] = useState("");
  return <><Link className="text-link" href="/workspace/leads">← Lead inbox</Link>
    {contactSavedFor === id && <div className="success" role="status">Contact and inquiry details saved.</div>}
    <ResourceState {...resource} />
    {resource.data && <LeadRecord key={`${resource.data.id}-${resource.data.activities.length}`} lead={resource.data} reload={resource.reload} onContactSaved={() => { setContactSavedFor(id); resource.reload(); }} />}
  </>;
}
function ContactInquiry({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const authorized = user?.role === "admin" || user?.id === lead.assigned_agent_id;
  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      message: String(data.get("message") || "").trim(),
    };
    if (payload.name.length < 2 || !payload.message) { setError("Enter a name of at least two characters and a non-empty inquiry message."); return; }
    setBusy(true); setError("");
    try { await api<Lead>(`/leads/${lead.id}`, json("PATCH", payload)); setEditing(false); onSaved(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel contact-inquiry">
    <h2>Contact & inquiry</h2>
    {editing && authorized ? <form className="stack" aria-label="Edit contact and inquiry" onSubmit={saveContact}>
      <fieldset className="stack" disabled={busy}>
        <label>Name<input name="name" minLength={2} maxLength={150} defaultValue={lead.name} required /></label>
        <label>Email<input name="email" type="email" maxLength={254} defaultValue={lead.email} required /></label>
        <label>Phone<input name="phone" type="tel" maxLength={30} defaultValue={lead.phone} required /></label>
        <label>Message<textarea name="message" rows={4} maxLength={5000} defaultValue={lead.message} required /></label>
      </fieldset>
      <Alert error={error} />
      <div className="inline-actions"><button disabled={busy}>{busy ? "Saving…" : "Save contact details"}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>Cancel</button></div>
    </form> : <>
      <p><a href={`mailto:${lead.email}`}>{lead.email}</a></p>
      <p><a href={`tel:${lead.phone}`}>{lead.phone}</a></p>
      <p className="description">{lead.message}</p>
      {authorized && <button className="secondary small" onClick={() => setEditing(true)}>Edit contact details</button>}
    </>}
    <p><Link className="text-link" href={`/workspace/properties/${lead.property_id}`}>View linked property →</Link></p>
  </section>;
}
function LeadRecord({ lead, reload, onContactSaved }: { lead: Lead; reload: () => void; onContactSaved: () => void }) {
  const staff = useResource<User[]>("/users"); const { user } = useAuth();
  const agents = staff.data?.filter((person) => person.role === "agent");
  const [assignedAgentId, setAssignedAgentId] = useState(lead.assigned_agent_id || "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [success, setSuccess] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setError(""); setBusy(true); setSuccess("");
    try { await api(`/leads/${lead.id}`, json("PATCH", { stage: data.get("stage"), next_follow_up_at: data.get("next_follow_up_at") ? new Date(String(data.get("next_follow_up_at"))).toISOString() : null, ...(user?.role === "admin" ? { assigned_agent_id: data.get("assigned_agent_id") || null } : {}) })); setSuccess("Lead updated."); reload(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function note(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const body = String(new FormData(form).get("body")).trim();
    if (!body) { setError("Enter a note before saving."); return; }
    setError(""); setBusy(true);
    try { await api(`/leads/${lead.id}/activities`, json("POST", { body })); form.reset(); reload(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <>
    <WorkspaceHeading eyebrow="LEAD PROFILE" title={lead.name} description={`Created ${new Date(lead.created_at).toLocaleString()}`} action={<span className="badge">{label(lead.stage)}</span>} />
    <Alert error={error} />
    {success && <div className="success" role="status">{success}</div>}
    <div className="workspace-two">
      <div>
        <ContactInquiry lead={lead} onSaved={onContactSaved} />
        <form className="panel stack" onSubmit={save}>
          <h2>Keep it moving</h2>
          <label>Stage<select name="stage" defaultValue={lead.stage}>{leadStages.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
          {user?.role === "admin" && <label>Assigned agent<select name="assigned_agent_id" value={assignedAgentId} onChange={(event) => setAssignedAgentId(event.target.value)}>
            <option value="">Unassigned</option>
            {agents?.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
            {lead.assigned_agent_id && !agents?.some((agent) => agent.id === lead.assigned_agent_id) && <option value={lead.assigned_agent_id}>Current assignment</option>}
          </select></label>}
          <ResourceState {...staff} />
          <label>Next follow-up (your local time)<input type="datetime-local" name="next_follow_up_at" defaultValue={localDate(lead.next_follow_up_at)} /></label>
          <button disabled={busy}>{busy ? "Saving…" : "Update lead"}</button>
        </form>
      </div>
      <section className="panel">
        <h2>Conversation timeline</h2>
        <p className="muted">Leave the details that make the next conversation better.</p>
        <form className="stack" onSubmit={note}><label>New note<textarea name="body" required rows={4} maxLength={5000} /></label><button disabled={busy}>{busy ? "Saving…" : "Add note"}</button></form>
        <div className="timeline">{lead.activities.length ? [...lead.activities].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((activity) => <article key={activity.id}><p className="description">{activity.body}</p><small>{staff.data?.find((person) => person.id === activity.actor_id)?.full_name || (activity.actor_id ? "Team member" : "Public inquiry")} · {new Date(activity.created_at).toLocaleString()}</small></article>) : <Empty title="A fresh conversation">Your notes will build a useful history here.</Empty>}</div>
      </section>
    </div>
  </>;
}
