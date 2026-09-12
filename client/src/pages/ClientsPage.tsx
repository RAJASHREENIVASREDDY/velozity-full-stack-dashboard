import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useClients } from "../api/hooks";
import type { ClientItem } from "../types";

export function ClientsPage(): JSX.Element {
  const { data, isLoading } = useClients();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const clients = ((data ?? []) as ClientItem[]);

  async function create(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await api.post("/clients", { name, company: company || undefined });
      setName(""); setCompany("");
      await qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (err: unknown) {
      setMsg((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed");
    }
  }

  async function archive(c: ClientItem): Promise<void> {
    if (!window.confirm(`Archive client "${c.name}"?`)) return;
    await api.delete(`/clients/${c.id}`);
    await qc.invalidateQueries({ queryKey: ["clients"] });
  }

  if (isLoading) return <div className="center">Loading…</div>;
  return (
    <div>
      <h2>Clients</h2>
      <div className="card">
        <h3>New client</h3>
        <form className="form-row" onSubmit={create}>
          <input placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          <button className="btn" type="submit">Create</button>
        </form>
        {msg ? <div className="error">{msg}</div> : null}
      </div>
      <div className="cards">
        {clients.map((c) => (
          <div key={c.id} className="card">
            <strong>{c.name}</strong>
            <div className="muted small">{c.company ?? "—"} · {c._count?.projects ?? 0} projects {c.archived ? "· archived" : ""}</div>
            {!c.archived ? <button className="btn secondary small" onClick={() => archive(c)}>Archive</button> : null}
          </div>
        ))}
      </div>
      {clients.length === 0 ? <div className="empty">No clients.</div> : null}
    </div>
  );
}
