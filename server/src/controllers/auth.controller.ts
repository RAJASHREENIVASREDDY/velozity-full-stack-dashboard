import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/ApiError.js";
import * as auth from "../services/auth.service.js";
import { loginSchema } from "../schemas/common.js";
import { requireAuth } from "../middleware/auth.js";

export const postLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await auth.login(email, password, res);
  const { password: _password, ...safe } = user as Record<string, unknown>;
  void _password;
  // login() returns user + accessToken merged; extract accessToken
  const accessToken = (user as unknown as { accessToken: string }).accessToken;
  res.json(success({ user: safe, accessToken }));
});

export const postRefresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await auth.refresh(req.cookies ?? {}, res);
  res.json(success(data));
});

export const postLogout = asyncHandler(async (req: Request, res: Response) => {
  await auth.logout(req.cookies ?? {}, res);
  res.json(success({ loggedOut: true }));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const u = requireAuth(req);
  const user = await auth.me(u.id);
  res.json(success({ user }));
});
