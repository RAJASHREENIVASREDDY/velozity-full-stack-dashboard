import { useMarkAllRead, useMarkRead, useNotifications } from "../api/hooks";
import { timeAgo } from "../utils/time";

export function NotificationsPage(): JSX.Element {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = ((data as { items: import("../types").NotificationItem[] } | undefined)?.items ?? []);

  if (isLoading) return <div className="center">Loading…</div>;
  return (
    <div>
      <h2>Notifications</h2>
      <div className="card">
        <button className="btn secondary" onClick={() => markAll.mutate()}>Mark all as read</button>
      </div>
      {items.length === 0 ? <div className="empty">No notifications.</div> : items.map((n) => (
        <div key={n.id} className={`card notif ${n.read ? "" : "unread"}`}>
          <strong>{n.title}</strong>
          <div>{n.message}</div>
          <div className="muted small">{timeAgo(n.createdAt)}</div>
          {!n.read ? <button className="link" onClick={() => markRead.mutate(n.id)}>Mark read</button> : null}
        </div>
      ))}
    </div>
  );
}
