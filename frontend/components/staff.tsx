import { FormEvent, useState } from "react";
import { api, json } from "../lib/api";
import { agentPayload, AGENT_PASSWORD_MIN_LENGTH } from "../lib/forms";
import type { User } from "../lib/types";
import { useAuth } from "./auth";
import { Alert, Empty } from "./ui";
import { ResourceState, useResource, WorkspaceHeading } from "./workspace";
import { label } from "../lib/utils";

export function StaffView() {
  const { user } = useAuth();
  return user?.role === "admin" ? <StaffAdmin /> : <Alert error="Team administration is available to administrators only." />;
}

function StaffAdmin() {
  const resource = useResource<User[]>("/users");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(""); setSuccess("");
    try {
      const user = await api<User>("/users", json("POST", agentPayload(data)));
      setSuccess(`${user.full_name}’s agent account has been created.`);
      form.reset(); resource.reload();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <WorkspaceHeading title="Agents & staff" description="Create agent accounts and keep your agency connected." />
    <div className="workspace-two">
      <section>
        <ResourceState {...resource} />
        {resource.data && <div className="panel">
          <h2>Your agency team</h2>
          {resource.data.map((user) => <div className="team-row" key={user.id}>
            <span className="avatar">{user.full_name.slice(0, 1)}</span>
            <div><strong>{user.full_name}</strong><small>{user.email}</small></div>
            <span className="badge">{label(user.role)}</span>
          </div>)}
          {!resource.data.length && <Empty title="No team members" />}
        </div>}
      </section>
      <form className="panel stack" onSubmit={create}>
        <p className="eyebrow">GROW YOUR TEAM</p>
        <h2>Welcome a new agent.</h2>
        <label>Full name<input name="full_name" autoComplete="name" required maxLength={150} /></label>
        <label>Work email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Initial password<input name="password" type="password" autoComplete="new-password" minLength={AGENT_PASSWORD_MIN_LENGTH} required aria-describedby="password-guidance" /></label>
        <p id="password-guidance" className="fine-print">Use at least {AGENT_PASSWORD_MIN_LENGTH} characters. The new account has agent permissions. Share initial credentials through a secure channel.</p>
        <Alert error={error} />
        {success && <div className="success" role="status">{success}</div>}
        <button disabled={busy}>{busy ? "Creating…" : "Create agent account"}</button>
      </form>
    </div>
  </>;
}
