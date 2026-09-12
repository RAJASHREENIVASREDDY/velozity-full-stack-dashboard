import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as tasks from "../services/task.service.js";
import { requireAuth } from "../middleware/auth.js";
import { createTaskSchema, taskFilterQuery, updateTaskSchema } from "../schemas/entities.js";
import { emitActivityToAuthorized, emitTaskUpdated } from "../sockets/index.js";
import { prisma } from "../config/db.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const f = taskFilterQuery.parse(req.query);
  res.json(success(await tasks.listTasks(requireAuth(req), f)));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await tasks.getTask(requireAuth(req), req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createTaskSchema.parse(req.body);
  const actor = requireAuth(req);
  const task = await tasks.createTask(actor, body);
  // Notify realtime: task created + possible assignment notification
  emitTaskUpdated(task.projectId, task);
  if (task.assignedDeveloperId) {
    const { emitNotificationToUser } = await import("../sockets/index.js");
    const n = await prisma.notification.findFirst({ where: { taskId: task.id, type: "TASK_ASSIGNED" }, orderBy: { createdAt: "desc" } });
    if (n) emitNotificationToUser(task.assignedDeveloperId, n);
  }
  res.status(201).json(success(task));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = updateTaskSchema.parse(req.body);
  const actor = requireAuth(req);
  const { task, activity } = (await tasks.updateTask(actor, req.params.id, body)) as { task: { id: string; projectId: string; title: string; status: string }; activity: unknown };
  emitTaskUpdated(task.projectId, task);
  if (activity) {
    // Load full activity with relations for broadcast
    const full = await prisma.activityLog.findUnique({
      where: { id: (activity as { id: string }).id },
      include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
    });
    if (full) emitActivityToAuthorized(full);
    // If IN_REVIEW, a notification was created for the PM — push it
    if ((task as { status: string }).status === "IN_REVIEW") {
      const { emitNotificationToUser } = await import("../sockets/index.js");
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { creatorId: true } });
      if (project && project.creatorId !== actor.id) {
        const n = await prisma.notification.findFirst({
          where: { taskId: task.id, type: "TASK_IN_REVIEW", userId: project.creatorId },
          orderBy: { createdAt: "desc" },
        });
        if (n) emitNotificationToUser(project.creatorId, n);
      }
    }
  }
  // Reassignment notification push
  if ((body as { assignedDeveloperId?: string | null }).assignedDeveloperId) {
    const { emitNotificationToUser } = await import("../sockets/index.js");
    const assignee = (body as { assignedDeveloperId: string }).assignedDeveloperId;
    if (assignee) {
      const n = await prisma.notification.findFirst({ where: { taskId: task.id, type: "TASK_ASSIGNED", userId: assignee }, orderBy: { createdAt: "desc" } });
      if (n) emitNotificationToUser(assignee, n);
    }
  }
  res.json(success(task));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await tasks.deleteTask(requireAuth(req), req.params.id)));
});
