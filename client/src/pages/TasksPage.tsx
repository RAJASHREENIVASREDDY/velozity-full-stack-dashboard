import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useTasks } from "../api/hooks";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import type { Priority, Task, TaskStatus } from "../types";

export function TasksPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data, isLoading } = useTasks(qs);
  const tasks = ((data as { tasks: Task[] } | undefined)?.tasks ?? []) as Task[];

  function set(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  async function advance(t: Task): Promise<void> {
    const order: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const i = order.indexOf(t.status);
    if (i < 0 || i >= order.length - 1) return;
    await api.patch(`/tasks/${t.id}`, { status: order[i + 1] });
    await qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <div>
      <h2>Tasks</h2>
      <div className="card form-row">
        <select value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">All statuses</option>
          {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"] as TaskStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={params.get("priority") ?? ""} onChange={(e) => set("priority", e.target.value)}>
          <option value="">All priorities</option>
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="date" value={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
        <input type="date" value={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
        <button className="btn secondary" onClick={() => setParams(new URLSearchParams())}>Clear</button>
      </div>
      {isLoading ? <div className="center">Loading…</div> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th><th /></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td className="muted">{t.project?.name}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td>{t.status !== "DONE" && t.status !== "OVERDUE" ? <button className="btn small" onClick={() => advance(t)}>Advance</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 ? <div className="empty">No tasks match these filters.</div> : null}
        </div>
      )}
    </div>
  );
}
