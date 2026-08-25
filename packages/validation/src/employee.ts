import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  email: z.string().email(),
  hireDate: z.string().datetime().or(z.string().min(1)),
  salary: z.number().positive().optional(),
  createLogin: z.boolean().optional().default(false),
  password: z.string().min(8).optional(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
