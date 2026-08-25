import { z } from "zod";

export const CreateAppraisalSchema = z.object({
  appraisalDate: z.string().min(1),
  percentageHike: z.number(),
  notes: z.string().max(2000).optional(),
});
export type CreateAppraisalInput = z.infer<typeof CreateAppraisalSchema>;
