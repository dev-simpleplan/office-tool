import { z } from "zod";
import { optionalUuid } from "./common.js";

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(200),
  departmentId: z.string().uuid(),
  teamLeadId: optionalUuid(),
  description: z.string().max(1000).optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  departmentId: z.string().uuid().optional(),
  teamLeadId: optionalUuid(),
  description: z.string().max(1000).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
