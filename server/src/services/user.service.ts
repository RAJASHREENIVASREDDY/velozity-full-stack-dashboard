import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword } from "../utils/password.js";
import type { AuthUser } from "../middleware/auth.js";
import { assertAdmin } from "./authorization.js";

const safeSelect = { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true } as const;

export async function listUsers(actor: AuthUser, page: number, pageSize: number) {
  assertAdmin(actor);
  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({ select: safeSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { total, page, pageSize, users };
}

export async function createUser(actor: AuthUser, input: { email: string; name: string; password: string; role: AuthUser["role"] }) {
  assertAdmin(actor);
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict("Email already in use");
  const user = await prisma.user.create({
    data: { email: input.email.toLowerCase(), name: input.name, password: await hashPassword(input.password), role: input.role },
    select: safeSelect,
  });
  return user;
}

export async function updateUser(actor: AuthUser, id: string, input: { name?: string; role?: AuthUser["role"]; isActive?: boolean }) {
  assertAdmin(actor);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("User not found");
  if (actor.id === id && input.role && input.role !== existing.role) {
    throw ApiError.badRequest("Admins cannot change their own role");
  }
  const user = await prisma.user.update({ where: { id }, data: input, select: safeSelect });
  return user;
}

export async function getUser(actor: AuthUser, id: string) {
  assertAdmin(actor);
  const user = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!user) throw ApiError.notFound("User not found");
  return user;
}
