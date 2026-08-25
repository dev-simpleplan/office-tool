import { z } from "zod";
import { optionalUuid } from "./common.js";

export const CreateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  email: z.string().email(),
  hireDate: z.string().datetime().or(z.string().min(1)),
  salary: z.number().positive().optional(),
  createLogin: z.boolean().optional().default(false),
  password: z.string().min(8).optional(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  scheduleId: optionalUuid(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  jobTitle: z.string().min(1).max(200).optional(),
  salary: z.number().positive().optional(),
  departmentId: optionalUuid(),
  teamId: optionalUuid(),
  scheduleId: optionalUuid(),
  leavesAvailable: z.number().int().min(0).optional(),
  leavesTaken: z.number().int().min(0).optional(),
});
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
