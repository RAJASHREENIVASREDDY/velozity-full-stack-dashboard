import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as projects from "../services/project.service.js";
import { requireAuth } from "../middleware/auth.js";
import { createProjectSchema, updateProjectSchema } from "../schemas/entities.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await projects.listProjects(requireAuth(req))));
});
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await projects.getProject(requireAuth(req), req.params.id)));
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createProjectSchema.parse(req.body);
  res.status(201).json(success(await projects.createProject(requireAuth(req), body)));
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = updateProjectSchema.parse(req.body);
  res.json(success(await projects.updateProject(requireAuth(req), req.params.id, body)));
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await projects.deleteProject(requireAuth(req), req.params.id)));
});
