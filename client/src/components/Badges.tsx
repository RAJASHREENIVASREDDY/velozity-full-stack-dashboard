import type { Priority, TaskStatus } from "../types";

const statusColor: Record<TaskStatus, string> = {
  TODO: "badge gray",
  IN_PROGRESS: "badge blue",
  IN_REVIEW: "badge amber",
  DONE: "badge green",
  OVERDUE: "badge red",
};

const priorityColor: Record<Priority, string> = {
  LOW: "badge gray",
  MEDIUM: "badge blue",
  HIGH: "badge amber",
  CRITICAL: "badge red",
};

export function StatusBadge({ status }: { status: TaskStatus }): JSX.Element {
  return <span className={statusColor[status]}>{status.replace(/_/g, " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }): JSX.Element {
  return <span className={priorityColor[priority]}>{priority}</span>;
}
