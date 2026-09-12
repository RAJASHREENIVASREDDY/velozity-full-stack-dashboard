import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useActivity, useAdminDashboard, useDevDashboard, usePmDashboard } from "../api/hooks";
import { ActivityFeed } from "../components/ActivityFeed";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { useRealtime } from "../hooks/useSocket";
import type { Activity } from "../types";

function useMergedActivity(server: Activity[] | undefined): Activity[] {
  const qc = useQueryClient();
  const live = (qc.getQueryData<Activity[]>(["live-activity"]) ?? []) as Activity[];
  // Realtime hook updates ["live-activity"]; merge with DB catch-up, dedupe by id.
  useRealtime();
  const map = new Map<string, Activity>();
  for (const a of [...live, ...(server ?? [])]) {
    if (!map.has(a.id)) map.set(a.id, a);
  }
  return [...map.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 40);
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isPM = user?.role === "PROJECT_MANAGER";

  const adminQ = useAdminDashboard(isAdmin);
  const pmQ = usePmDashboard(isPM);
  const devQ = useDevDashboard(!isAdmin && !isPM);
  const activityQ = useActivity(20);

  const admin = adminQ.data as { totalProjects: number; totalTasks: number; tasksByStatus: Record<string, number>; overdueCount: number; recentActivity: Activity[]; onlineNow: number } | undefined;
  const pm = pmQ.data as { projects: import("../types").Project[]; tasksByPriority: Record<string, number>; upcomingDue: import("../types").Task[]; recentActivity: Activity[]; unreadCount: number } | undefined;
  const dev = devQ.data as { tasks: import("../types").Task[]; recentActivity: Activity[]; unreadCount: number } | undefined;
  const serverActivity = (activityQ.data ?? (isAdmin ? admin?.recentActivity : isPM ? pm?.recentActivity : dev?.recentActivity) ?? []) as Activity[];
  const merged = useMergedActivity(serverActivity);

  useEffect(() => {
    document.title = "Dashboard · Velozity";
  }, []);

  if (isAdmin && admin) {
    return (
      <div>
        <h2>Admin Dashboard</h2>
        <div className="cards">
          <div className="card stat"><div className="stat-num">{admin.totalProjects}</div><div className="muted">Projects</div></div>
          <div className="card stat"><div className="stat-num">{admin.totalTasks}</div><div className="muted">Tasks</div></div>
          <div className="card stat"><div className="stat-num">{admin.overdueCount}</div><div className="muted">Overdue</div></div>
          <div className="card stat"><div className="stat-num">{admin.onlineNow ?? 0}</div><div className="muted">Online now (live)</div></div>
        </div>
        <div className="grid2">
          <div className="card"><h3>Tasks by status</h3><StatusRows data={admin.tasksByStatus} /></div>
          <div className="card"><h3>Global activity (live)</h3><ActivityFeed items={merged} /></div>
        </div>
      </div>
    );
  }

  if (isPM && pm) {
    return (
      <div>
        <h2>My Projects</h2>
        <div className="cards">
          {pm.projects.map((p) => (
            <div key={p.id} className="card"><strong>{p.name}</strong><div className="muted small">{p.client?.name} · {p._count?.tasks ?? 0} tasks</div></div>
          ))}
          {pm.projects.length === 0 ? <div className="empty">No projects yet. Create one from the Projects page.</div> : null}
        </div>
        <div className="grid2">
          <div className="card"><h3>Tasks by priority</h3><StatusRows data={pm.tasksByPriority} /></div>
          <div className="card"><h3>Due this week</h3>
            {pm.upcomingDue.length === 0 ? <div className="empty">Nothing due this week.</div> :
              <ul className="list">{pm.upcomingDue.map((t) => <li key={t.id}>{t.title} <span className="muted">· {t.project?.name} · {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</span></li>)}</ul>}
          </div>
        </div>
        <div className="card"><h3>Recent activity (live)</h3><ActivityFeed items={merged} /></div>
      </div>
    );
  }

  return (
    <div>
      <h2>My Tasks</h2>
      {!dev ? <div className="center">Loading…</div> : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
              <tbody>
                {dev.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td className="muted">{t.project?.name}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dev.tasks.length === 0 ? <div className="empty">No tasks assigned.</div> : null}
          </div>
          <div className="card"><h3>Activity on my tasks (live)</h3><ActivityFeed items={merged} /></div>
        </>
      )}
    </div>
  );
}

function StatusRows({ data }: { data: Record<string, number> }): JSX.Element {
  const entries = Object.entries(data);
  if (entries.length === 0) return <div className="empty">No data.</div>;
  return (
    <ul className="list">
      {entries.map(([k, v]) => <li key={k}><span>{k.replace(/_/g, " ")}</span><strong> {v}</strong></li>)}
    </ul>
  );
}
