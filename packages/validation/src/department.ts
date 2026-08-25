import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;
