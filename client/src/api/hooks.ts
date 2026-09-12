import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Activity, ApiSuccess, ClientItem, NotificationItem, Project, Task, User } from "../types";

async function get<T>(url: string): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url);
  return res.data.data;
}

// Auth
export function useMe(enabled: boolean): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => get<{ user: User }>("/auth/me"),
    enabled,
    retry: false,
  }) as ReturnType<typeof useQuery>;
}

// Dashboards
export function useAdminDashboard(enabled: boolean) {
  return useQuery({ queryKey: ["dash-admin"], queryFn: () => get<{ totalProjects: number; totalTasks: number; tasksByStatus: Record<string, number>; overdueCount: number; recentActivity: Activity[]; onlineNow: number }>("/dashboard/admin"), enabled });
}
export function usePmDashboard(enabled: boolean) {
  return useQuery({ queryKey: ["dash-pm"], queryFn: () => get<{ projects: Project[]; tasksByPriority: Record<string, number>; upcomingDue: Task[]; recentActivity: Activity[]; unreadCount: number }>("/dashboard/pm"), enabled });
}
export function useDevDashboard(enabled: boolean) {
  return useQuery({ queryKey: ["dash-dev"], queryFn: () => get<{ tasks: Task[]; recentActivity: Activity[]; unreadCount: number }>("/dashboard/dev"), enabled });
}

// Projects
export function useProjects(enabled = true) {
  return useQuery({ queryKey: ["projects"], queryFn: () => get<Project[]>("/projects"), enabled });
}
export function useProject(id: string | undefined) {
  return useQuery({ queryKey: ["project", id], queryFn: () => get<Project>(`/projects/${id}`), enabled: !!id });
}

// Tasks (filters come from URL query params)
export function useTasks(queryString: string) {
  return useQuery({
    queryKey: ["tasks", queryString],
    queryFn: () => get<{ total: number; tasks: Task[] }>(`/tasks${queryString}`),
  });
}

// Activity catch-up (last N authorized events from DB)
export function useActivity(limit = 20) {
  return useQuery({ queryKey: ["activity", limit], queryFn: () => get<Activity[]>(`/activity?limit=${limit}`) });
}

// Notifications
export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => get<{ items: NotificationItem[]; unreadCount: number; total: number }>("/notifications?pageSize=50") });
}
export function useUnreadCount() {
  return useQuery({ queryKey: ["unread-count"], queryFn: () => get<{ unreadCount: number }>("/notifications/unread-count"), refetchInterval: false });
}
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all").then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

// Clients & users (admin)
export function useClients() {
  return useQuery({ queryKey: ["clients"], queryFn: () => get<ClientItem[]>("/clients") });
}
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => get<{ users: User[]; total: number }>("/users?pageSize=100") });
}
