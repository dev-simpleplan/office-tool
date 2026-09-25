import { z } from "zod";
import { optionalUuid } from "./common.js";

export const ASSIGNABLE_ROLES = ["ADMIN", "TEAM_LEAD", "PROJECT_MANAGER", "EMPLOYEE"] as const;

export const CreateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  email: z.string().email(),
  hireDate: z.string().datetime().or(z.string().min(1)),
  dateOfBirth: z.string().datetime().or(z.string().length(0)).or(z.string().min(1)).optional(),
  salary: z.number().positive().optional(),
  createLogin: z.boolean().optional().default(false),
  password: z.string().min(8).optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  scheduleId: optionalUuid(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  jobTitle: z.string().min(1).max(200).optional(),
  dateOfBirth: z.string().datetime().or(z.string().length(0)).or(z.string().min(1)).optional(),
  salary: z.number().positive().optional(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  scheduleId: optionalUuid(),
  leavesAvailable: z.number().int().min(0).optional(),
});
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

export const CreateLoginSchema = z.object({
  password: z.string().min(8),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
});
export type CreateLoginInput = z.infer<typeof CreateLoginSchema>;

export const LEAVE_TYPES = ["SICK", "CASUAL", "VACATION", "UNPAID", "OTHER"] as const;

export const CreateLeaveRequestSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  type: z.enum(LEAVE_TYPES).optional().default("VACATION"),
  notes: z.string().max(1000).optional(),
});
export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;

export const UpdateRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
