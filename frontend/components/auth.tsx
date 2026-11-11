import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, json, TOKEN_KEY } from "../lib/api";
import type { User } from "../lib/types";

type Auth = { user: User | null; loading: boolean; error: string; refresh: () => Promise<void>; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setUser(sessionStorage.getItem(TOKEN_KEY) ? await api<User>("/auth/me") : null); }
    catch (error) { setUser(null); setError((error as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const expired = () => { setUser(null); setError("Your session expired. Please sign in again."); };
    window.addEventListener("aqarflow:unauthorized", expired);
    return () => window.removeEventListener("aqarflow:unauthorized", expired);
  }, [refresh]);
  async function login(email: string, password: string) {
    const result = await api<{ access_token: string; token_type: string; user: User }>("/auth/login", json("POST", { email, password }), false);
    if (!result.access_token || result.token_type !== "bearer") throw new Error("The server returned an invalid sign-in response.");
    sessionStorage.setItem(TOKEN_KEY, result.access_token); setUser(result.user); setError("");
  }
  async function logout() {
    try { await api("/auth/logout", json("POST")); }
    finally { sessionStorage.removeItem(TOKEN_KEY); setUser(null); }
  }
  return <AuthContext.Provider value={{ user, loading, error, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
