import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import type { AuthUser } from "../middleware/auth.js";

export async function listNotifications(actor: AuthUser, unreadOnly: boolean | undefined, page: number, pageSize: number) {
  const [total, unreadCount, items] = await Promise.all([
    prisma.notification.count({ where: { userId: actor.id, ...(unreadOnly ? { read: false } : {}) } }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
    prisma.notification.findMany({
      where: { userId: actor.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
    }),
  ]);
  return { total, unreadCount, page, pageSize, items };
}

export async function unreadCount(actor: AuthUser): Promise<{ unreadCount: number }> {
  const unreadCount = await prisma.notification.count({ where: { userId: actor.id, read: false } });
  return { unreadCount };
}

export async function markRead(actor: AuthUser, id: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== actor.id) throw ApiError.notFound("Notification not found");
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(actor: AuthUser) {
  const r = await prisma.notification.updateMany({ where: { userId: actor.id, read: false }, data: { read: true } });
  return { updated: r.count };
}
