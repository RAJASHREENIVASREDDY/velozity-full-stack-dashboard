import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useProject } from "../api/hooks";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import type { TaskStatus } from "../types";

const NEXT: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "TODO"],
  IN_REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
  OVERDUE: ["IN_PROGRESS", "TODO"],
};

export function ProjectDetailPage(): JSX.Element {
  const { id } = useParams();
  const { data, isLoading, error } = useProject(id);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function createTask(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await api.post("/tasks", { title, projectId: id, assignedDeveloperId: assignee || undefined });
      setTitle(""); setAssignee("");
      await qc.invalidateQueries({ queryKey: ["project", id] });
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed";
      setMsg(m);
    }
  }

  async function setStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      await qc.invalidateQueries({ queryKey: ["project", id] });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed";
      setMsg(m);
    }
  }

  if (isLoading) return <div className="center">Loading…</div>;
  if (error || !data) return <div className="error">Project not found or access denied.</div>;
  const p = data as import("../types").Project;

  return (
    <div>
      <h2>{p.name}</h2>
      <div className="muted">{p.client?.name} · {p.description}</div>
      {msg ? <div className="error">{msg}</div> : null}
      <div className="card">
        <h3>Add task</h3>
        <form className="form-row" onSubmit={createTask}>
          <input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input placeholder="Assignee user id (optional)" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th>Actions</th></tr></thead>
          <tbody>
            {(p.tasks ?? []).map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td className="muted">{t.assignedDeveloper?.name ?? "—"}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                <td>
                  <div className="actions">
                    {NEXT[t.status].map((s) => <button key={s} className="btn small" onClick={() => setStatus(t.id, s)}>→ {s.replace("_", " ")}</button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(p.tasks ?? []).length === 0 ? <div className="empty">No tasks yet.</div> : null}
      </div>
    </div>
  );
}
