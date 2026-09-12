import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "../components/NotificationBell";

export function AppLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  async function onLogout(): Promise<void> {
    await logout();
    nav("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Velozity</div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && <NavLink to="/projects">Projects</NavLink>}
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/admin/users">Users</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin/clients">Clients</NavLink>}
        </nav>
        <div className="side-foot">
          <div className="small muted">{user?.name} · {user?.role}</div>
          <button className="btn secondary" onClick={onLogout}>Logout</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <strong>Client Project Dashboard</strong>
          <div className="top-right">
            <NotificationBell />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
