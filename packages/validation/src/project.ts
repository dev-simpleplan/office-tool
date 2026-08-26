import { z } from "zod";
import { optionalUuid } from "./common.js";

export const PROJECT_STATUSES = [
  "PLANNING",
  "NOT_STARTED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  client: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  projectLeadId: optionalUuid(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  estimatedHours: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
