import type { PropertyHistoryEntry } from "../lib/types";
import { propertyAction, propertyChanges } from "../lib/property-history";
import { Empty } from "./ui";
import { ResourceState, useResource } from "./workspace";

export function PropertyHistory({ propertyId }: { propertyId: string }) {
  const resource = useResource<PropertyHistoryEntry[]>(`/properties/${encodeURIComponent(propertyId)}/history`);
  return <section className="panel property-history" aria-labelledby="property-history-title">
    <h2 id="property-history-title">Property activity history</h2>
    <p className="muted">Changes to this property, its publication, and its photos.</p>
    <ResourceState {...resource} />
    {resource.data && (resource.data.length ? <div className="timeline">
      {[...resource.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((entry) => <article key={entry.id}>
        <h3>{propertyAction(entry.action)}</h3>
        {propertyChanges(entry.details).map((change) => <p key={change}>{change}</p>)}
        <small>{new Date(entry.created_at).toLocaleString()} · {entry.actor_id ? "Agency team member" : "System"}</small>
      </article>)}
    </div> : <Empty title="No property activity yet">Changes will appear here after the property is updated.</Empty>)}
  </section>;
}
