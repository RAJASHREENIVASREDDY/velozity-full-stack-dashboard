import type { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import type { AuthUser } from "../middleware/auth.js";
import { assertCanCreateTask, assertTaskVisible } from "./authorization.js";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  from?: string;
  to?: string;
  projectId?: string;
  q?: string;
  page: number;
  pageSize: number;
}

function buildWhere(actor: AuthUser, f: TaskFilters): Parameters<typeof prisma.task.findMany>[0] extends never ? never : Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (f.status) where.status = f.status;
  if (f.priority) where.priority = f.priority;
  if (f.projectId) where.projectId = f.projectId;
  if (f.from || f.to) {
    const dueDate: Record<string, Date> = {};
    if (f.from) dueDate.gte = new Date(f.from);
    if (f.to) {
      const end = new Date(f.to);
      end.setHours(23, 59, 59, 999);
      dueDate.lte = end;
    }
    where.dueDate = dueDate;
  }
  if (f.q) where.title = { contains: f.q, mode: "insensitive" };

  if (actor.role === "DEVELOPER") {
    where.assignedDeveloperId = actor.id;
  } else if (actor.role === "PROJECT_MANAGER") {
    where.project = { creatorId: actor.id };
  }
  // ADMIN: no scoping
  return where;
}

export async function listTasks(actor: AuthUser, f: TaskFilters) {
  const where = buildWhere(actor, f);
  // PM cross-project isolation: if projectId given, verify ownership first
  if (actor.role === "PROJECT_MANAGER" && f.projectId) {
    const p = await prisma.project.findUnique({ where: { id: f.projectId }, select: { creatorId: true } });
    if (!p || p.creatorId !== actor.id) throw ApiError.notFound("Project not found");
  }
  if (actor.role === "DEVELOPER" && f.projectId) {
    // Developers may filter by project only if they have a task there; enforce via assignment scope (where already scopes).
    // Keep scope; no extra check needed.
  }
  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      include: {
        project: { select: { id: true, name: true, creatorId: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { total, page: f.page, pageSize: f.pageSize, tasks };
}

export async function getTask(actor: AuthUser, id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignedDeveloper: { select: { id: true, name: true, email: true } } },
  });
  if (!task) throw ApiError.notFound("Task not found");
  assertTaskVisible(actor, { assignedDeveloperId: task.assignedDeveloperId, projectId: task.projectId, project: task.project });
  return task;
}

export async function createTask(actor: AuthUser, input: { title: string; description?: string; projectId: string; assignedDeveloperId?: string | null; status?: TaskStatus; priority?: Priority; dueDate?: string | null }) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw ApiError.notFound("Project not found");
  assertCanCreateTask(actor, project);

  const assigneeId: string | null = input.assignedDeveloperId ?? null;
  if (assigneeId) {
    const dev = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!dev || !dev.isActive) throw ApiError.badRequest("Invalid developer");
    if (dev.role !== "DEVELOPER" && dev.role !== "PROJECT_MANAGER" && dev.role !== "ADMIN") {
      throw ApiError.badRequest("Invalid assignee");
    }
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      assignedDeveloperId: assigneeId,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
    include: { project: true },
  });

  const actorName = actor.name;
  // Activity + notification in same flow (task creation)
  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      actorId: actor.id,
      action: "TASK_CREATED",
      newStatus: task.status,
      message: `${actorName} created task "${task.title}"`,
    },
  });

  if (assigneeId) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `${actorName} assigned you "${task.title}"`,
        taskId: task.id,
        projectId: task.projectId,
      },
    });
  }

  return task;
}

export interface TaskUpdateResult {
  task: Awaited<ReturnType<typeof prisma.task.findUnique>>;
  statusChanged: boolean;
  prevStatus?: TaskStatus;
}

export async function updateTask(
  actor: AuthUser,
  id: string,
  input: { title?: string; description?: string | null; assignedDeveloperId?: string | null; status?: TaskStatus; priority?: Priority; dueDate?: string | null },
): Promise<{ task: unknown; activity: unknown }> {
  const existing = await prisma.task.findUnique({ where: { id }, include: { project: true } });
  if (!existing) throw ApiError.notFound("Task not found");
  assertTaskVisible(actor, { assignedDeveloperId: existing.assignedDeveloperId, projectId: existing.projectId, project: existing.project });

  const prevStatus = existing.status;
  const nextStatus = input.status ?? prevStatus;
  const statusChanged = nextStatus !== prevStatus;

  if (actor.role === "DEVELOPER") {
    // Developers may only change status of their own tasks. Nothing else.
    const keys = Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined);
    const illegal = keys.filter((k) => k !== "status");
    if (illegal.length > 0) throw ApiError.forbidden("Developers can only update task status");
    if (existing.assignedDeveloperId !== actor.id) throw ApiError.notFound("Task not found");
  } else {
    // PM/Admin: if reassigning, validate assignee
    if (input.assignedDeveloperId !== undefined && input.assignedDeveloperId !== null) {
      const dev = await prisma.user.findUnique({ where: { id: input.assignedDeveloperId } });
      if (!dev || !dev.isActive) throw ApiError.badRequest("Invalid developer");
    }
    // PM ownership already enforced by assertTaskVisible for their projects
    if (actor.role === "PROJECT_MANAGER") {
      assertCanCreateTask(actor, existing.project);
    }
  }

  const reassignedTo = input.assignedDeveloperId !== undefined && input.assignedDeveloperId !== existing.assignedDeveloperId
    ? input.assignedDeveloperId
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.assignedDeveloperId !== undefined ? { assignedDeveloperId: input.assignedDeveloperId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
      },
      include: { project: true, assignedDeveloper: { select: { id: true, name: true } } },
    });

    let activity = null;
    if (statusChanged) {
      activity = await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          taskId: task.id,
          actorId: actor.id,
          action: "STATUS_CHANGED",
          prevStatus,
          newStatus: nextStatus,
          message: `${actor.name} moved "${task.title}" from ${pretty(prevStatus)} to ${pretty(nextStatus)}`,
        },
      });
    }

    if (reassignedTo) {
      await tx.notification.create({
        data: {
          userId: reassignedTo,
          type: "TASK_ASSIGNED",
          title: "New task assigned",
          message: `${actor.name} assigned you "${task.title}"`,
          taskId: task.id,
          projectId: task.projectId,
        },
      });
    }

    if (statusChanged && nextStatus === "IN_REVIEW") {
      // Notify PM owner (project creator) unless they performed the change themselves
      if (task.project.creatorId !== actor.id) {
        await tx.notification.create({
          data: {
            userId: task.project.creatorId,
            type: "TASK_IN_REVIEW",
            title: "Task ready for review",
            message: `${actor.name} moved "${task.title}" to In Review`,
            taskId: task.id,
            projectId: task.projectId,
          },
        });
      }
    }

    return { task, activity };
  });

  return result;
}

export async function deleteTask(actor: AuthUser, id: string) {
  const existing = await prisma.task.findUnique({ where: { id }, include: { project: true } });
  if (!existing) throw ApiError.notFound("Task not found");
  if (actor.role === "DEVELOPER") throw ApiError.forbidden("Developers cannot delete tasks");
  assertCanCreateTask(actor, existing.project);
  await prisma.task.delete({ where: { id } });
  return { deleted: true };
}

export function pretty(s: TaskStatus): string {
  return s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}
