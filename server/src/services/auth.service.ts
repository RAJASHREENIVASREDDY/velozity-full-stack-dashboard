import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyPassword } from "../utils/password.js";
import {
  REFRESH_COOKIE_NAME,
  newRefreshJti,
  refreshCookieOptions,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import type { AuthUser } from "../middleware/auth.js";
import type { Response } from "express";

const REFRESH_MS = env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

function sanitizeUser(u: { id: string; email: string; name: string; role: AuthUser["role"]; isActive: boolean; createdAt: Date; updatedAt: Date }) {
  return u;
}

export async function login(email: string, password: string, res: Response): Promise<ReturnType<typeof sanitizeUser>> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");
  const ok = await verifyPassword(password, user.password);
  if (!ok) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = signAccessToken(user);
  const jti = newRefreshJti();
  const refreshToken = signRefreshToken(user.id, jti);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      jti,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_MS),
    },
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(REFRESH_MS));
  const { password: _pw, ...safe } = user;
  return { ...safe, ...( { accessToken } as unknown as object) } as unknown as ReturnType<typeof sanitizeUser>;
}

export function issueAccess(user: { id: string; email: string; role: string }): string {
  return signAccessToken(user);
}

export async function refresh(reqCookies: Record<string, string | undefined>, res: Response): Promise<{ accessToken: string }> {
  const incoming = reqCookies[REFRESH_COOKIE_NAME];
  if (!incoming) throw ApiError.unauthorized("Refresh token missing");
  let payload;
  try {
    payload = verifyRefreshToken(incoming);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
  const record = await prisma.refreshToken.findUnique({ where: { jti: payload.jti }, include: { user: true } });
  if (!record || record.revoked || record.expiresAt < new Date()) throw ApiError.unauthorized("Refresh token revoked or expired");
  if (record.tokenHash !== sha256(incoming)) throw ApiError.unauthorized("Refresh token mismatch");
  if (!record.user.isActive) throw ApiError.unauthorized("Account inactive");

  // Rotate: revoke old, issue new
  const jti = newRefreshJti();
  const next = signRefreshToken(record.userId, jti);
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } }),
    prisma.refreshToken.create({
      data: { userId: record.userId, jti, tokenHash: sha256(next), expiresAt: new Date(Date.now() + REFRESH_MS) },
    }),
  ]);
  res.cookie(REFRESH_COOKIE_NAME, next, refreshCookieOptions(REFRESH_MS));
  return { accessToken: signAccessToken(record.user) };
}

export async function logout(reqCookies: Record<string, string | undefined>, res: Response): Promise<void> {
  const incoming = reqCookies[REFRESH_COOKIE_NAME];
  if (incoming) {
    try {
      const payload = verifyRefreshToken(incoming);
      await prisma.refreshToken.updateMany({ where: { jti: payload.jti }, data: { revoked: true } });
    } catch {
      // ignore invalid token on logout
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
}

export async function me(userId: string): Promise<{ id: string; email: string; name: string; role: AuthUser["role"]; isActive: boolean; createdAt: Date; updatedAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw ApiError.unauthorized("User not found");
  return user;
}
