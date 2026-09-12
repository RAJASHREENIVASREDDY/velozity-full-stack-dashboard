import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import type { AuthUser } from "../middleware/auth.js";

export async function listClients(actor: AuthUser) {
  if (actor.role === "DEVELOPER") throw ApiError.forbidden("Developers cannot view clients");
  return prisma.client.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { projects: true } } } });
}

export async function getClient(actor: AuthUser, id: string) {
  if (actor.role === "DEVELOPER") throw ApiError.forbidden("Developers cannot view clients");
  const client = await prisma.client.findUnique({ where: { id }, include: { projects: { select: { id: true, name: true, creatorId: true, createdAt: true } } } });
  if (!client) throw ApiError.notFound("Client not found");
  return client;
}

export async function createClient(actor: AuthUser, input: { name: string; email?: string; company?: string; phone?: string }) {
  if (actor.role !== "ADMIN") throw ApiError.forbidden("Only admins can manage clients");
  return prisma.client.create({ data: { name: input.name, email: input.email || null, company: input.company, phone: input.phone } });
}

export async function updateClient(actor: AuthUser, id: string, input: { name?: string; email?: string; company?: string; phone?: string; archived?: boolean }) {
  if (actor.role !== "ADMIN") throw ApiError.forbidden("Only admins can manage clients");
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Client not found");
  return prisma.client.update({
    where: { id },
    data: { ...(input.name ? { name: input.name } : {}), ...(input.email !== undefined ? { email: input.email || null } : {}), ...(input.company !== undefined ? { company: input.company } : {}), ...(input.phone !== undefined ? { phone: input.phone } : {}), ...(input.archived !== undefined ? { archived: input.archived } : {}) },
  });
}

export async function deleteClient(actor: AuthUser, id: string) {
  if (actor.role !== "ADMIN") throw ApiError.forbidden("Only admins can manage clients");
  const existing = await prisma.client.findUnique({ where: { id }, include: { _count: { select: { projects: true } } } });
  if (!existing) throw ApiError.notFound("Client not found");
  if (existing._count.projects > 0) {
    // Archive instead of hard delete to preserve history
    return prisma.client.update({ where: { id }, data: { archived: true } });
  }
  await prisma.client.delete({ where: { id } });
  return { archived: false, deleted: true };
}
