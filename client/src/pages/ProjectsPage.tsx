import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useClients, useProjects } from "../api/hooks";

export function ProjectsPage(): JSX.Element {
  const { data, isLoading, error } = useProjects();
  const { data: clients } = useClients();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post("/projects", { name, clientId, description: desc || undefined });
      setName(""); setDesc(""); setClientId("");
      await qc.invalidateQueries({ queryKey: ["projects"] });
      setMsg("Project created.");
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Create failed";
      setMsg(m);
    }
  }

  if (isLoading) return <div className="center">Loading projects…</div>;
  if (error) return <div className="error">Failed to load projects.</div>;
  const projects = (data ?? []) as import("../types").Project[];
  const clientList = (clients ?? []) as import("../types").ClientItem[];

  return (
    <div>
      <h2>Projects</h2>
      <div className="card">
        <h3>New project</h3>
        <form className="form-row" onSubmit={onCreate}>
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select client…</option>
            {clientList.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button className="btn" type="submit">Create</button>
        </form>
        {msg ? <div className="small muted">{msg}</div> : null}
      </div>
      <div className="cards">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card link-card">
            <strong>{p.name}</strong>
            <div className="muted small">{p.client?.name} · {p._count?.tasks ?? 0} tasks</div>
            <div className="muted small">By {p.creator?.name}</div>
          </Link>
        ))}
      </div>
      {projects.length === 0 ? <div className="empty">No projects.</div> : null}
    </div>
  );
}
