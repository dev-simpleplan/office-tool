import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  email: z.string().email(),
  hireDate: z.string().datetime().or(z.string().min(1)),
  salary: z.number().positive().optional(),
  createLogin: z.boolean().optional().default(false),
  password: z.string().min(8).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  jobTitle: z.string().min(1).max(200).optional(),
  salary: z.number().positive().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
});
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
