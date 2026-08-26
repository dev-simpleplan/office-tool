import { z } from "zod";
import { optionalUuid } from "./common.js";

export const TASK_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: optionalUuid(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  assigneeId: optionalUuid(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.coerce.number().nonnegative().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/** Fields an EMPLOYEE may change on a task assigned to them — status/checklist-adjacent only. */
export const EmployeeTaskUpdateSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  description: z.string().max(2000).optional(),
});
export type EmployeeTaskUpdateInput = z.infer<typeof EmployeeTaskUpdateSchema>;

export const CreateChecklistItemSchema = z.object({
  label: z.string().min(1).max(300),
  order: z.number().int().optional(),
});
export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemSchema>;

export const UpdateChecklistItemSchema = z.object({
  label: z.string().min(1).max(300).optional(),
  isDone: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;

export const CreateTimeEntrySchema = z.object({
  employeeId: optionalUuid(),
  date: z.string().min(1),
  hours: z.coerce.number().positive().max(24),
  description: z.string().max(1000).optional(),
});
export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntrySchema>;

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
