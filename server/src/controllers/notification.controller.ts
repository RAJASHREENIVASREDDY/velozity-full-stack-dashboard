import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as notifications from "../services/notification.service.js";
import { requireAuth } from "../middleware/auth.js";
import { notificationQuery } from "../schemas/entities.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = notificationQuery.parse(req.query);
  res.json(success(await notifications.listNotifications(requireAuth(req), q.unreadOnly, q.page, q.pageSize)));
});
export const count = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await notifications.unreadCount(requireAuth(req))));
});
export const markOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await notifications.markRead(requireAuth(req), req.params.id)));
});
export const markAll = asyncHandler(async (_req: Request, res: Response) => {
  res.json(success(await notifications.markAllRead(requireAuth(_req))));
});
