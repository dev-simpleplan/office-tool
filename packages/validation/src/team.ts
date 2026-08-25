import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(200),
  departmentId: z.string().uuid(),
  teamLeadId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  departmentId: z.string().uuid().optional(),
  teamLeadId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
