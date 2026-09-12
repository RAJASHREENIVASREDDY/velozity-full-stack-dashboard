import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(user: { id: string; email: string; role: string }): string {
  const payload: AccessPayload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function newRefreshJti(): string {
  return crypto.randomUUID();
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshPayload = { sub: userId, jti };
  const days = env.REFRESH_TOKEN_EXPIRES_IN_DAYS;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${days}d` });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function refreshCookieOptions(maxAgeMs: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  const secure = env.COOKIE_SECURE;
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? ("none" as const) : ("lax" as const),
    path: "/api/auth",
    maxAge: maxAgeMs,
  };
}

export const REFRESH_COOKIE_NAME = "velozity_refresh";
