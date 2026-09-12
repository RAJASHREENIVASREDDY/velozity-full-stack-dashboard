import { z } from "zod";

export const RoleEnum = z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]);
export const TaskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"]);
export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const cuid = z.string().min(1).max(64);

export const idParamSchema = z.object({ id: z.string().min(1) });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
