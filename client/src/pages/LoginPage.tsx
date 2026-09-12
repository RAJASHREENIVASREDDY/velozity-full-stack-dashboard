import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@velozity.local");
  const [password, setPassword] = useState("Velozity123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Velozity Dashboard</h1>
        <p className="muted">Internal agency dashboard. Sign in to continue.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <div className="small muted">Seeded accounts: admin@velozity.local, pm1@velozity.local, dev1@velozity.local — password Velozity123!</div>
      </form>
    </div>
  );
}
