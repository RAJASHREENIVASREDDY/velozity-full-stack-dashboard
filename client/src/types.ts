export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "OVERDUE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientItem {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  archived: boolean;
  createdAt: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  creatorId: string;
  createdAt: string;
  client?: ClientItem;
  creator?: { id: string; name: string; email: string };
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  assignedDeveloperId?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; creatorId?: string };
  assignedDeveloper?: { id: string; name: string; email: string } | null;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId?: string | null;
  action: string;
  prevStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  message: string;
  createdAt: string;
  actor?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string | null;
  projectId?: string | null;
  read: boolean;
  createdAt: string;
  task?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
