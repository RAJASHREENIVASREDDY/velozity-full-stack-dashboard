import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as clients from "../services/client.service.js";
import { requireAuth } from "../middleware/auth.js";
import { createClientSchema, updateClientSchema } from "../schemas/entities.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await clients.listClients(requireAuth(req))));
});
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await clients.getClient(requireAuth(req), req.params.id)));
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = createClientSchema.parse(req.body);
  res.status(201).json(success(await clients.createClient(requireAuth(req), body)));
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = updateClientSchema.parse(req.body);
  res.json(success(await clients.updateClient(requireAuth(req), req.params.id, body)));
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(success(await clients.deleteClient(requireAuth(req), req.params.id)));
});
