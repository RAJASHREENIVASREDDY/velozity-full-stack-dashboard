import { z } from "zod";
import { PriorityEnum, TaskStatusEnum } from "./common.js";

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]).optional(),
  isActive: z.boolean().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(255).optional().or(z.literal("")),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  clientId: z.string().min(1).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  projectId: z.string().min(1),
  assignedDeveloperId: z.string().min(1).nullable().optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  assignedDeveloperId: z.string().min(1).nullable().optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
});

export const taskFilterQuery = z.object({
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  projectId: z.string().min(1).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
});

export const notificationQuery = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
