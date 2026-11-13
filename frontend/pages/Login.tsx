import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import Link from "../components/link";
import { useAuth } from "../components/auth";
import { Alert, Brand, Scene } from "../components/ui";
import { Icon } from "../components/icons";
export default function Login() {
  const { login, user, error: sessionError } = useAuth(); const navigate = useNavigate();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await login(String(form.get("email")), String(form.get("password"))); navigate("/workspace", { replace: true }); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <main className="login-layout"><div className="login-art"><div className="login-story"><p className="eyebrow">YOUR BUSINESS. BEAUTIFULLY CONNECTED.</p><h1>Less busywork.<br /><em>More possibility.</em></h1><p>Your properties, conversations and next moves.<br />Together in one considered workspace.</p><div className="login-art-footer"><Icon name="home" size={18} /><span>From the first inquiry to the final handshake.</span></div>  </div><Scene /></div><div className="login-form"><Brand /><Link href="/" className="text-link">← Back to AqarFlow</Link><span className="login-symbol"><Icon name="key" size={23} /></span><p className="eyebrow">WELCOME TO YOUR WORKSPACE</p><h2>Admin / Agent sign in</h2><p className="muted">Good to have you back. Sign in with your work account to pick up where you left off.</p>{user ? <Link className="button" href="/workspace">Continue to workspace <Icon name="arrow" size={17} /></Link> : <form onSubmit={submit} className="stack"><label>Work email<input type="email" name="email" autoComplete="username" required placeholder="you@agency.com" /></label><label>Password<input type="password" name="password" autoComplete="current-password" required placeholder="Enter your password" /></label><Alert error={error || sessionError} /><button disabled={busy}>{busy ? "Signing in…" : <>Sign in to workspace <Icon name="arrow" size={17} /></>}</button></form>}<div className="login-role-note"><Icon name="shield" size={14} />Your role determines your workspace access.</div><p className="fine-print">Need an account or a password reset? Contact your agency administrator. Your session is kept only in this browser tab.</p></div></main>;
}
