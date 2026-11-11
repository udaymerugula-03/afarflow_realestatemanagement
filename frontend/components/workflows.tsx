import { FormEvent, useState } from "react";
import Link from "./link";
import { api, json } from "../lib/api";
import { ASSIGNED_RECORD_LIMIT, canCreateDeal } from "../lib/forms";
import type { Deal, Lead, Page, Property, User, Visit } from "../lib/types";
import { label, matchingProperty, money, visitInterval } from "../lib/utils";
import { Alert, Empty } from "./ui";
import { useAuth } from "./auth";
import { ResourceState, useResource, WorkspaceHeading } from "./workspace";
const dealStages = ["inquiry", "qualified", "visit", "offer", "negotiation", "booking", "documentation", "closed_won", "closed_lost"];
const visitStatuses = ["requested", "confirmed", "completed", "cancelled", "no_show"];

export function WorkflowView({ kind }: { kind: "visits" | "deals" }) {
  const resource = useResource<(Visit | Deal)[]>(`/${kind}`); const [creating, setCreating] = useState(false);
  return <>
    <WorkspaceHeading title={kind === "visits" ? "Visits" : "Deals"}
      description={kind === "visits" ? "Coordinate viewings, avoid conflicts, and keep everyone connected." : "Move from first inquiry to a successful close."}
      action={<button onClick={() => setCreating(!creating)}>{creating ? "Close form" : kind === "visits" ? "+ Schedule visit" : "+ Create deal"}</button>} />
    {creating && <WorkflowCreate kind={kind} onCreated={() => { setCreating(false); resource.reload(); }} />}
    <ResourceState {...resource} />
    {resource.data && <>
      <p className="fine-print" role="status">Showing {resource.data.length} accessible {kind}. The API returns at most {ASSIGNED_RECORD_LIMIT} records{resource.data.length >= ASSIGNED_RECORD_LIMIT ? "; additional records may not be shown" : ""}. Pipeline counts reflect these returned records.</p>
      {kind === "deals" && <div className="pipeline-summary">{dealStages.map((stage) => <div key={stage}><strong>{resource.data!.filter((item) => "stage" in item && item.stage === stage).length}</strong><span>{label(stage)}</span></div>)}</div>}
      <div className="workflow-grid">{resource.data.map((record) => <WorkflowCard key={record.id} kind={kind} record={record} reload={resource.reload} />)}</div>
      {!resource.data.length && <Empty title={kind === "visits" ? "A clear calendar" : "Your next opportunity starts here"}>{kind === "visits" ? "Schedule a viewing for one of your leads." : "Create a deal linked to a lead and their property."}</Empty>}
    </>}
  </>;
}
function WorkflowCreate({ kind, onCreated }: { kind: "visits" | "deals"; onCreated: () => void }) {
  const leads = useResource<Page<Lead>>("/leads?page=1&page_size=100");
  const properties = useResource<Page<Property>>("/properties?page=1&page_size=100");
  const users = useResource<User[]>("/users"); const { user } = useAuth();
  const [leadId, setLeadId] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const lead = leads.data?.items.find((item) => item.id === leadId);
  const listedOptions = matchingProperty(properties.data?.items || [], lead);
  const linkedProperty = useResource<Property>(lead && !properties.loading && !listedOptions.length ? `/properties/${encodeURIComponent(lead.property_id)}` : null);
  const options = listedOptions.length ? listedOptions : linkedProperty.data && linkedProperty.data.id === lead?.property_id ? [linkedProperty.data] : [];
  const agents = users.data?.filter((agent) => agent.role === "agent" && agent.id === lead?.assigned_agent_id) || [];
  const available = !!options[0] && ["available", "reserved"].includes(options[0].status);
  const needsQualification = kind === "deals" && !!lead && !canCreateDeal(lead.stage);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setError("");
    if (!lead || data.get("property_id") !== lead.property_id) { setError("Select the property linked to this lead."); return; }
    if (needsQualification) { setError("Qualify this lead before creating a deal."); return; }
    if (!available) { setError("Visits and deals require an available or reserved property."); return; }
    if (!lead.assigned_agent_id || (user?.role === "agent" ? user.id : data.get("agent_id")) !== lead.assigned_agent_id) { setError("Choose the agent assigned to the lead. An administrator can update the lead assignment first."); return; }
    let payload: Record<string, unknown> = { lead_id: lead.id, property_id: lead.property_id, agent_id: user?.role === "agent" ? user.id : data.get("agent_id"), notes: data.get("notes") };
    try {
      if (kind === "visits") payload = { ...payload, status: data.get("status"), ...visitInterval(String(data.get("starts_at")), String(data.get("ends_at"))) };
      else payload = { ...payload, stage: data.get("stage"), offer_amount: data.get("offer_amount") };
      setBusy(true); await api(`/${kind}`, json("POST", payload)); onCreated();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <form className="panel stack" onSubmit={submit}>
    <h2>{kind === "visits" ? "Plan a property visit" : "Start a new opportunity"}</h2>
    <ResourceState {...leads} /><ResourceState {...properties} /><ResourceState {...users} /><ResourceState {...linkedProperty} />
    <div className="form-grid">
      <label>Lead<select required value={leadId} onChange={(event) => setLeadId(event.target.value)}><option value="" disabled>Choose a lead</option>{leads.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label>
      <label>Linked property<select key={`${leadId}-${options[0]?.id || ""}`} name="property_id" required defaultValue={options[0]?.id || ""}><option value="" disabled>{lead ? "Select matching property" : "Choose a lead first"}</option>{options.map((property) => <option key={property.id} value={property.id}>{property.reference_code} · {property.title}</option>)}</select></label>
      {user?.role === "admin" ? <label>Responsible agent<select key={`${leadId}-${agents[0]?.id || ""}`} name="agent_id" required defaultValue={agents[0]?.id || ""}><option value="" disabled>Choose the assigned agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}</select></label> : <label>Responsible agent<input value={user?.full_name || ""} readOnly /></label>}
      {kind === "visits" ? <>
        <label>Initial status<select name="status" defaultValue="confirmed"><option value="requested">Requested</option><option value="confirmed">Confirmed</option></select></label>
        <label>Starts (your local time)<input type="datetime-local" name="starts_at" required /></label>
        <label>Ends (your local time)<input type="datetime-local" name="ends_at" required /></label>
      </> : <>
        <label>Stage<select name="stage">{dealStages.map((stage) => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
        <label>Offer amount (PKR)<input type="number" step="0.01" min="0" name="offer_amount" required /></label>
      </>}
    </div>
    {lead && !lead.assigned_agent_id && <div className="alert" role="alert">Assign this lead to an agent before creating a visit or deal. <Link className="text-link" href={`/workspace/leads/${lead.id}`}>Open lead assignment →</Link></div>}
    {needsQualification && <div className="alert" role="alert">Qualify this lead before creating a deal. Eligible stages are Qualified, Visit Scheduled, and Negotiation. <Link className="text-link" href={`/workspace/leads/${lead.id}`}>Open lead →</Link></div>}
    {options.length > 0 && !available && <Alert error="This property must be available or reserved before a visit or deal can be created." />}
    <p className="fine-print">Selectors show up to 100 accessible leads and properties. A linked property outside that collection is loaded separately. The responsible agent must match the lead assignment. Scheduling conflicts are checked by the server.</p>
    <label>Notes<textarea name="notes" rows={3} maxLength={5000} /></label>
    <Alert error={error} />
    <button disabled={busy || needsQualification || !available || !lead?.assigned_agent_id || leads.loading || properties.loading || linkedProperty.loading || users.loading || (user?.role === "admin" && !agents.length)}>{busy ? "Saving…" : kind === "visits" ? "Schedule visit" : "Create deal"}</button>
  </form>;
}
function WorkflowCard({ kind, record, reload }: { kind: "visits" | "deals"; record: Visit | Deal; reload: () => void }) {
  const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const visit = "starts_at" in record ? record : null; const deal = "offer_amount" in record ? record : null;
  const state = visit?.status || deal!.stage;
  const stageLocked = deal?.stage === "closed_won";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await api(`/${kind}/${record.id}`, json("PATCH", Object.fromEntries(data.entries()))); setEditing(false); reload(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <article className="panel workflow-card">
    <div className="row-between">
      <span className={`badge ${state}`}>{label(state)}</span>
      <button className="secondary small" disabled={busy} onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Update"}</button>
    </div>
    <h3>{visit ? new Date(visit.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : money(deal!.offer_amount)}</h3>
    {visit && <p>{new Date(visit.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(visit.ends_at).toLocaleString()}</p>}
    <Link className="text-link" href={`/workspace/leads/${record.lead_id}`}>View lead →</Link>
    <Link className="text-link" href={`/workspace/properties/${record.property_id}`}>View property →</Link>
    <p className="description muted">{record.notes || "No notes yet."}</p>
    {editing && <form className="stack" onSubmit={save}>
      <fieldset className="stack" disabled={busy}>
        <label>{visit ? "Status" : "Stage"}
          <select name={visit ? "status" : "stage"} defaultValue={state} disabled={stageLocked}>
            {(visit ? visitStatuses : dealStages).map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        {stageLocked && <p className="fine-print">Won deals are final and cannot be reopened. You can still update the notes and offer amount.</p>}
        {deal && <label>Offer amount (PKR)<input type="number" name="offer_amount" step="0.01" min="0" max="99999999999999.99" defaultValue={deal.offer_amount} required /></label>}
        <label>Notes<textarea name="notes" defaultValue={record.notes} maxLength={5000} rows={3} /></label>
      </fieldset>
      <Alert error={error} />
      <button disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>}
  </article>;
}
