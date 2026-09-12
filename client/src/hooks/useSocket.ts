import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Activity, NotificationItem } from "../types";

let socket: Socket | null = null;
let connectedToken: string | null = null;

function ensureSocket(token: string): Socket {
  if (socket && connectedToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(API_URL, { auth: { token }, withCredentials: true });
  connectedToken = token;
  return socket;
}

export function useRealtime(): { socket: Socket | null } {
  const { user, token } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const t = token();
    if (!t) return;
    const s = ensureSocket(t);

    const onActivity = (a: Activity): void => {
      qc.setQueryData<Activity[]>(["live-activity"], (old) => {
        const cur = old ?? [];
        if (cur.some((x) => x.id === a.id)) return cur;
        return [a, ...cur].slice(0, 100);
      });
      void qc.invalidateQueries({ queryKey: ["activity"] });
      void qc.invalidateQueries({ queryKey: ["dash-admin"] });
      void qc.invalidateQueries({ queryKey: ["dash-pm"] });
      void qc.invalidateQueries({ queryKey: ["dash-dev"] });
    };
    const onTask = (): void => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["project"] });
      void qc.invalidateQueries({ queryKey: ["dash-pm"] });
      void qc.invalidateQueries({ queryKey: ["dash-dev"] });
    };
    const onNotif = (n: NotificationItem): void => {
      qc.setQueryData<{ items: NotificationItem[]; unreadCount: number; total: number }>(["notifications"], (old) => {
        if (!old) return old as never;
        if (old.items.some((x) => x.id === n.id)) return old;
        return { ...old, items: [n, ...old.items], unreadCount: old.unreadCount + 1, total: old.total + 1 };
      });
      void qc.invalidateQueries({ queryKey: ["unread-count"] });
    };
    const onCount = (p: { unreadCount: number }): void => {
      qc.setQueryData(["unread-count"], { success: true, data: p });
    };
    const onPresence = (): void => {
      void qc.invalidateQueries({ queryKey: ["dash-admin"] });
    };

    s.on("activity:new", onActivity);
    s.on("task:updated", onTask);
    s.on("notification:new", onNotif);
    s.on("notification:unreadCount", onCount);
    s.on("presence:onlineCount", onPresence);
    return () => {
      s.off("activity:new", onActivity);
      s.off("task:updated", onTask);
      s.off("notification:new", onNotif);
      s.off("notification:unreadCount", onCount);
      s.off("presence:onlineCount", onPresence);
    };
  }, [user, qc, token]);

  return { socket };
}

export function useRealtimeShared(): { socket: Socket | null } {
  const r = useRealtime();
  return { socket: r.socket ?? socket };
}

export function useProjectRoom(projectId: string | undefined): void {
  const { user } = useAuth();
  const { socket: s } = useRealtimeShared();
  useEffect(() => {
    if (!s || !user || !projectId) return;
    s.emit("project:join", projectId);
    return () => {
      s.emit("project:leave", projectId);
    };
  }, [s, projectId, user]);
}
