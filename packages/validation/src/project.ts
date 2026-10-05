import { z } from "zod";
import { optionalUuid } from "./common.js";

export const PROJECT_STATUSES = [
  "PLANNING",
  "NOT_STARTED",
  "ACTIVE",
  "MAINTENANCE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

/** A blank number input submits "" (which z.coerce would turn into 0), so treat it as "not set". */
const optionalHours = () =>
  z
    .preprocess((v) => (v === "" ? null : v), z.coerce.number().nonnegative().max(744).nullable())
    .optional();

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
  technologies: z.array(z.string()).optional().default([]),
  projectTypeId: optionalUuid(),
  monthlyHours: optionalHours(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const CreateProjectTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export type CreateProjectTypeInput = z.infer<typeof CreateProjectTypeSchema>;

export const UpdateProjectTypeSchema = CreateProjectTypeSchema;
export type UpdateProjectTypeInput = CreateProjectTypeInput;
