import { z } from "zod";

export const WorkScheduleDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isWorkingDay: z.boolean(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  breakMinutes: z.number().int().min(0).max(600).default(0),
});

export const CreateWorkScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  days: z.array(WorkScheduleDaySchema).length(7),
});
export type CreateWorkScheduleInput = z.infer<typeof CreateWorkScheduleSchema>;

export const UpdateWorkScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  days: z.array(WorkScheduleDaySchema).length(7).optional(),
});
export type UpdateWorkScheduleInput = z.infer<typeof UpdateWorkScheduleSchema>;
