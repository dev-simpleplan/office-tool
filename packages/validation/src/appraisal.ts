import { z } from "zod";

export const CreateAppraisalSchema = z.object({
  appraisalDate: z.string().min(1),
  percentageHike: z.number(),
  notes: z.string().max(2000).optional(),
});
export type CreateAppraisalInput = z.infer<typeof CreateAppraisalSchema>;

export const UpdateAppraisalSchema = z.object({
  appraisalDate: z.string().min(1).optional(),
  percentageHike: z.number().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateAppraisalInput = z.infer<typeof UpdateAppraisalSchema>;
