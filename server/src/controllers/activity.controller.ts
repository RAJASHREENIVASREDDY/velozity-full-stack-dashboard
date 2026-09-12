import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as activity from "../services/activity.service.js";
import { requireAuth } from "../middleware/auth.js";
import { activityQuery } from "../schemas/entities.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = activityQuery.parse(req.query);
  res.json(success(await activity.recentActivity(requireAuth(req), q.limit, q.projectId, q.taskId)));
});
