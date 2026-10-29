import { z } from "zod";

import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "../constants";

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    }
    return val ?? null;
  }, schema);
}

/** Mesajlar çeviri anahtarıdır (messages/<dil>.json → validation); form ve action aynı şemayı kullanır. */
export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "tasks.validation.titleRequired")
    .max(200, "tasks.validation.titleMax"),
  description: emptyToNull(
    z.string().trim().max(2000, "tasks.validation.descriptionMax").nullable(),
  ).optional(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.enum(TASK_PRIORITY_VALUES),
  dueDate: emptyToNull(
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "tasks.validation.dateInvalid")
      .nullable(),
  ).optional(),
  memberId: emptyToNull(z.string().trim().max(100).nullable()).optional(),
  meetingId: emptyToNull(z.string().trim().max(100).nullable()).optional(),
});

export const taskUpdateSchema = taskSchema.extend({
  id: z.string().min(1),
});

export const taskDeleteSchema = z.object({
  id: z.string().min(1),
});

export const taskCompleteSchema = z.object({
  id: z.string().min(1),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
