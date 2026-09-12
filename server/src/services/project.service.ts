import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import type { AuthUser } from "../middleware/auth.js";
import { assertCanManageProject } from "./authorization.js";

export async function listProjects(actor: AuthUser) {
  if (actor.role === "ADMIN") {
    return prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, creator: { select: { id: true, name: true, email: true } }, _count: { select: { tasks: true } } },
    });
  }
  if (actor.role === "PROJECT_MANAGER") {
    return prisma.project.findMany({
      where: { creatorId: actor.id },
      orderBy: { createdAt: "desc" },
      include: { client: true, creator: { select: { id: true, name: true, email: true } }, _count: { select: { tasks: true } } },
    });
  }
  throw ApiError.forbidden("Developers cannot list projects");
}

export async function getProject(actor: AuthUser, id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, creator: { select: { id: true, name: true, email: true } }, tasks: { orderBy: { createdAt: "desc" }, include: { assignedDeveloper: { select: { id: true, name: true, email: true } } } } },
  });
  if (!project) throw ApiError.notFound("Project not found");
  if (actor.role === "ADMIN") return project;
  if (actor.role === "PROJECT_MANAGER") {
    if (project.creatorId !== actor.id) throw ApiError.notFound("Project not found");
    return project;
  }
  throw ApiError.forbidden("Developers cannot view project details");
}

export async function createProject(actor: AuthUser, input: { name: string; description?: string; clientId: string }) {
  if (actor.role !== "ADMIN" && actor.role !== "PROJECT_MANAGER") throw ApiError.forbidden("Developers cannot create projects");
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || client.archived) throw ApiError.badRequest("Invalid or archived client");
  return prisma.project.create({
    data: { name: input.name, description: input.description, clientId: input.clientId, creatorId: actor.id },
    include: { client: true },
  });
}

export async function updateProject(actor: AuthUser, id: string, input: { name?: string; description?: string | null; clientId?: string }) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw ApiError.notFound("Project not found");
  assertCanManageProject(actor, project);
  if (input.clientId) {
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client || client.archived) throw ApiError.badRequest("Invalid or archived client");
  }
  return prisma.project.update({ where: { id }, data: input, include: { client: true } });
}

export async function deleteProject(actor: AuthUser, id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw ApiError.notFound("Project not found");
  assertCanManageProject(actor, project);
  await prisma.project.delete({ where: { id } });
  return { deleted: true };
}
