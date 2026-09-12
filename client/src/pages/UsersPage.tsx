import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useUsers } from "../api/hooks";
import type { Role, User } from "../types";

export function UsersPage(): JSX.Element {
  const { data, isLoading } = useUsers();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("DEVELOPER");
  const [msg, setMsg] = useState<string | null>(null);
  const users = ((data as { users: User[] } | undefined)?.users ?? []);

  async function create(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await api.post("/users", { email, name, password, role });
      setEmail(""); setName(""); setPassword("");
      await qc.invalidateQueries({ queryKey: ["users"] });
      setMsg("User created.");
    } catch (err: unknown) {
      setMsg((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed");
    }
  }

  async function setRoleOf(u: User, next: Role): Promise<void> {
    await api.patch(`/users/${u.id}`, { role: next });
    await qc.invalidateQueries({ queryKey: ["users"] });
  }

  if (isLoading) return <div className="center">Loading…</div>;
  return (
    <div>
      <h2>User Management</h2>
      <div className="card">
        <h3>Create user</h3>
        <form className="form-row" onSubmit={create}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ADMIN">ADMIN</option>
            <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
            <option value="DEVELOPER">DEVELOPER</option>
          </select>
          <button className="btn" type="submit">Create</button>
        </form>
        {msg ? <div className="small muted">{msg}</div> : null}
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td className="muted">{u.email}</td><td>{u.role}</td><td>{u.isActive ? "Yes" : "No"}</td>
                <td>
                  <select value={u.role} onChange={(e) => setRoleOf(u, e.target.value as Role)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                    <option value="DEVELOPER">DEVELOPER</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
