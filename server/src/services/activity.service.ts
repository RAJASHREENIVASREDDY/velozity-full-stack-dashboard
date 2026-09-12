import { prisma } from "../config/db.js";
import type { AuthUser } from "../middleware/auth.js";

export async function recentActivity(actor: AuthUser, limit: number, projectId?: string, taskId?: string) {
  const take = Math.min(Math.max(limit, 1), 100);
  if (actor.role === "ADMIN") {
    return prisma.activityLog.findMany({
      where: { ...(projectId ? { projectId } : {}), ...(taskId ? { taskId } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }
  if (actor.role === "PROJECT_MANAGER") {
    // Only own projects. If a foreign projectId is requested, return empty (do not leak).
    if (projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId }, select: { creatorId: true } });
      if (!p || p.creatorId !== actor.id) return [];
    }
    return prisma.activityLog.findMany({
      where: { project: { creatorId: actor.id }, ...(projectId ? { projectId } : {}), ...(taskId ? { taskId } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }
  // DEVELOPER: only activities for tasks assigned to them
  return prisma.activityLog.findMany({
    where: { task: { assignedDeveloperId: actor.id }, ...(projectId ? { projectId } : {}), ...(taskId ? { taskId } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
  });
}
