import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import Link from "../components/link";
import { useAuth } from "../components/auth";
import { Alert, Brand, Scene } from "../components/ui";
export default function Login() {
  const { login, user, error: sessionError } = useAuth(); const navigate = useNavigate();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await login(String(form.get("email")), String(form.get("password"))); navigate("/workspace", { replace: true }); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <main className="login-layout"><div className="login-art"><Brand /><div><p className="eyebrow">YOUR BUSINESS. IN FLOW.</p><h1>Great relationships.<br /><em>Remarkable places.</em></h1><p>One connected workspace for every property, conversation, and opportunity.</p></div><Scene /></div><div className="login-form"><Link href="/" className="text-link">← Back to AqarFlow</Link><p className="eyebrow">THE AQARFLOW WORKSPACE</p><h2>Admin / Agent sign in</h2><p className="muted">Sign in with your agency Admin or Agent account. Your permissions are applied automatically.</p>{user ? <Link className="button" href="/workspace">Continue to workspace ↗</Link> : <form onSubmit={submit} className="stack"><label>Work email<input type="email" name="email" autoComplete="username" required placeholder="you@agency.com" /></label><label>Password<input type="password" name="password" autoComplete="current-password" required /></label><Alert error={error || sessionError} /><button disabled={busy}>{busy ? "Signing in…" : "Sign in to workspace ↗"}</button></form>}<p className="fine-print">Need an account or a password reset? Contact your agency administrator. Your session is kept only in this browser tab.</p></div></main>;
}
