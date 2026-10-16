import { z } from "zod";

export const workspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createWorkspaceSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(3).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  timeZone: z.string().trim().min(1).max(100).optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.iso.date().optional(),
  assigneeId: z.uuid().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccess<T> = { data: T };
