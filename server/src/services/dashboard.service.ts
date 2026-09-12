import { prisma } from "../config/db.js";
import type { AuthUser } from "../middleware/auth.js";

export async function adminDashboard(actor: AuthUser) {
  const [totalProjects, totalTasks, byStatus, overdue, recent] = await Promise.all([
    prisma.project.count(),
    prisma.task.count(),
    prisma.task.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.task.count({ where: { status: "OVERDUE" } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
    }),
  ]);
  void actor;
  const tasksByStatus: Record<string, number> = {};
  for (const r of byStatus) tasksByStatus[r.status] = r._count.status;
  return { totalProjects, totalTasks, tasksByStatus, overdueCount: overdue, recentActivity: recent };
}

export async function pmDashboard(actor: AuthUser) {
  const projects = await prisma.project.findMany({
    where: { creatorId: actor.id },
    include: { _count: { select: { tasks: true } }, client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);
  const [byPriority, upcoming, recent, unread] = await Promise.all([
    prisma.task.groupBy({ by: ["priority"], where: { projectId: { in: projectIds } }, _count: { priority: true } }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds }, dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) }, status: { notIn: ["DONE"] } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { project: { select: { id: true, name: true } }, assignedDeveloper: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
    }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
  ]);
  const tasksByPriority: Record<string, number> = {};
  for (const r of byPriority) tasksByPriority[r.priority] = r._count.priority;
  return { projects, tasksByPriority, upcomingDue: upcoming, recentActivity: recent, unreadCount: unread };
}

export async function devDashboard(actor: AuthUser) {
  const tasks = await prisma.task.findMany({
    where: { assignedDeveloperId: actor.id },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  const taskIds = tasks.map((t) => t.id);
  const [recent, unread] = await Promise.all([
    prisma.activityLog.findMany({
      where: { taskId: { in: taskIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
    }),
    prisma.notification.count({ where: { userId: actor.id, read: false } }),
  ]);
  return { tasks, recentActivity: recent, unreadCount: unread };
}
