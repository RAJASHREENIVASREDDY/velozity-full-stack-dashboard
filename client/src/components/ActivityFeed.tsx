import type { Activity } from "../types";
import { formatExact, timeAgo } from "../utils/time";

export function ActivityFeed({ items, emptyText = "No activity yet." }: { items: Activity[]; emptyText?: string }): JSX.Element {
  if (items.length === 0) return <div className="empty">{emptyText}</div>;
  return (
    <ul className="timeline">
      {items.map((a) => (
        <li key={a.id} className="timeline-item" title={formatExact(a.createdAt)}>
          <div className="timeline-dot" />
          <div className="timeline-body">
            <div className="timeline-msg">{a.message}</div>
            <div className="timeline-meta">
              {a.project?.name ? <span className="muted">{a.project.name} · </span> : null}
              <span className="muted">{timeAgo(a.createdAt)}</span>
              <span className="muted" title={formatExact(a.createdAt)}> · {new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
