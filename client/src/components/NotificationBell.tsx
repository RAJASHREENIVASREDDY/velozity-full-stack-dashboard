import { useState } from "react";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../api/hooks";
import { timeAgo } from "../utils/time";

export function NotificationBell(): JSX.Element {
  const [open, setOpen] = useState(false);
  const { data: list } = useNotifications();
  const { data: count } = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const unread = (count as { unreadCount: number } | undefined)?.unreadCount ?? (list as { unreadCount: number } | undefined)?.unreadCount ?? 0;
  const items = (list as { items: import("../types").NotificationItem[] } | undefined)?.items ?? [];

  return (
    <div className="bell-wrap">
      <button className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        🔔{unread > 0 ? <span className="badge-count">{unread}</span> : null}
      </button>
      {open ? (
        <div className="dropdown">
          <div className="dropdown-head">
            <strong>Notifications</strong>
            <button className="link" onClick={() => markAll.mutate()}>Mark all read</button>
          </div>
          <div className="dropdown-list">
            {items.length === 0 ? <div className="empty">No notifications.</div> : items.slice(0, 20).map((n) => (
              <div key={n.id} className={`notif ${n.read ? "" : "unread"}`}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="muted small">{timeAgo(n.createdAt)}</div>
                {!n.read ? <button className="link" onClick={() => markRead.mutate(n.id)}>Mark read</button> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
