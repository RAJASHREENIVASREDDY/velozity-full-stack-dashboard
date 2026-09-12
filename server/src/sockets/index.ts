import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { onlineCount, userConnected, userDisconnected } from "./presence.js";

let io: Server | null = null;

interface AuthedSocket extends Socket {
  data: { userId: string; role: string; name: string };
}

async function canAccessProject(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { creatorId: true } });
  if (!project) return false;
  if (role === "PROJECT_MANAGER") return project.creatorId === userId;
  // DEVELOPER: allowed to join only if they have a task in the project
  const t = await prisma.task.findFirst({ where: { projectId, assignedDeveloperId: userId }, select: { id: true } });
  return !!t;
}

export function initSockets(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL.split(","), credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ?? null;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, name: true, isActive: true } });
      if (!user || !user.isActive) return next(new Error("UNAUTHORIZED"));
      (socket as AuthedSocket).data = { userId: user.id, role: user.role, name: user.name };
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (raw) => {
    const socket = raw as AuthedSocket;
    const { userId, role } = socket.data;
    socket.join(`user:${userId}`);
    if (role === "ADMIN") socket.join("role:ADMIN");

    const count = userConnected(userId);
    io?.to("role:ADMIN").emit("presence:onlineCount", { onlineCount: count });

    socket.on("project:join", async (projectId: string, ack?: (res: unknown) => void) => {
      if (typeof projectId !== "string") return ack?.({ ok: false });
      const ok = await canAccessProject(userId, role, projectId);
      if (!ok) return ack?.({ ok: false, error: "FORBIDDEN" });
      socket.join(`project:${projectId}`);
      ack?.({ ok: true });
    });

    socket.on("project:leave", (projectId: string) => {
      if (typeof projectId === "string") socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      const n = userDisconnected(userId);
      io?.to("role:ADMIN").emit("presence:onlineCount", { onlineCount: n });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

/** Emit activity only to authorized recipients:
 *  - ADMIN room gets everything
 *  - project room members (membership already authorization-checked on join)
 *  - PLUS direct emit to assignee if they are not in the project room.
 *  Frontend merges by id, so duplicates are safe but we avoid double-send to same socket set
 *  by relying on rooms; socket.io dedupes per socket automatically when emitting to multiple rooms in one call. */
export function emitActivityToAuthorized(activity: {
  id: string;
  projectId: string;
  taskId?: string | null;
  [k: string]: unknown;
}): void {
  if (!io) return;
  void (async () => {
    const rooms = [`project:${activity.projectId}`, "role:ADMIN"];
    if (activity.taskId) {
      const task = await prisma.task.findUnique({ where: { id: activity.taskId as string }, select: { assignedDeveloperId: true } }).catch(() => null);
      if (task?.assignedDeveloperId) rooms.push(`user:${task.assignedDeveloperId}`);
    }
    getIO().to(rooms).emit("activity:new", activity);
  })();
}

export function emitTaskUpdated(projectId: string, task: unknown): void {
  if (!io) return;
  io.to([`project:${projectId}`, "role:ADMIN"]).emit("task:updated", task);
}

export function emitNotificationToUser(userId: string, notification: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit("notification:new", notification);
  void (async () => {
    const unreadCount = await prisma.notification.count({ where: { userId, read: false } }).catch(() => 0);
    io?.to(`user:${userId}`).emit("notification:unreadCount", { unreadCount });
  })();
}

export { onlineCount };
