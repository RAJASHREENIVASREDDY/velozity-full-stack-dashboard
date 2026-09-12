import type { Project, Role, Task } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import type { AuthUser } from "../middleware/auth.js";

/** Security strategy: use 404 when hiding existence from unauthorized users for
 *  cross-owner reads, 403 for explicit role violations. Both are documented in README. */

export function assertAdmin(user: AuthUser): void {
  if (user.role !== "ADMIN") throw ApiError.forbidden("Admin access required");
}

export function canViewProject(user: AuthUser, project: Pick<Project, "creatorId">): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "PROJECT_MANAGER") return project.creatorId === user.id;
  return false; // developers access projects only indirectly through tasks; no direct project read
}

export function assertCanManageProject(user: AuthUser, project: Pick<Project, "creatorId">): void {
  if (user.role === "ADMIN") return;
  if (user.role === "PROJECT_MANAGER" && project.creatorId === user.id) return;
  if (user.role === "PROJECT_MANAGER") throw ApiError.notFound("Project not found");
  throw ApiError.forbidden("You do not have permission to manage projects");
}

export function assertCanCreateTask(user: AuthUser, project: Pick<Project, "creatorId">): void {
  if (user.role === "ADMIN") return;
  if (user.role === "PROJECT_MANAGER" && project.creatorId === user.id) return;
  if (user.role === "PROJECT_MANAGER") throw ApiError.notFound("Project not found");
  throw ApiError.forbidden("Developers cannot create or assign tasks");
}

export function assertTaskVisible(
  user: AuthUser,
  task: Pick<Task, "assignedDeveloperId" | "projectId"> & { project?: Pick<Project, "creatorId"> | null },
): void {
  if (user.role === "ADMIN") return;
  if (user.role === "PROJECT_MANAGER") {
    if (task.project && task.project.creatorId === user.id) return;
    throw ApiError.notFound("Task not found");
  }
  // DEVELOPER
  if (task.assignedDeveloperId === user.id) return;
  throw ApiError.notFound("Task not found");
}

export function developerUpdatableFields(): Array<"status"> {
  return ["status"];
}

export function assertRoleAllowed(user: AuthUser, allowed: Role[]): void {
  if (!allowed.includes(user.role)) throw ApiError.forbidden("You do not have permission to access this resource");
}
