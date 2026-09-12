import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as users from "../services/user.service.js";
import { requireAuth } from "../middleware/auth.js";
import { createUserSchema, updateUserSchema } from "../schemas/entities.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  res.json(success(await users.listUsers(actor, page, pageSize)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const body = createUserSchema.parse(req.body);
  res.status(201).json(success(await users.createUser(actor, body)));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  res.json(success(await users.getUser(actor, req.params.id)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const body = updateUserSchema.parse(req.body);
  res.json(success(await users.updateUser(actor, req.params.id, body)));
});
