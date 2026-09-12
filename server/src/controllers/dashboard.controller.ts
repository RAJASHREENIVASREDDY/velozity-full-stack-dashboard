import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as dash from "../services/dashboard.service.js";
import { requireAuth } from "../middleware/auth.js";
import { onlineCount } from "../sockets/presence.js";

export const admin = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const data = await dash.adminDashboard(actor);
  res.json(success({ ...data, onlineNow: onlineCount() }));
});

export const pm = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await dash.pmDashboard(requireAuth(req))));
});

export const dev = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await dash.devDashboard(requireAuth(req))));
});
