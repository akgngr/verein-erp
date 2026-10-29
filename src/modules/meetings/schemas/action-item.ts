import { z } from "zod";

/**
 * Görev (aksiyon maddesi) şemaları (5. bölüm md. 10 ve 12).
 * KARAR: Sorumlu YA aktif kullanıcı (assigneeId + assigneeLabel) YA serbest
 * metin ad (assigneeId = null) YA hiçbiri olabilir.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const baseFields = {
  description: z
    .string()
    .trim()
    .min(3, "meetings.validation.taskMin")
    .max(1000, "meetings.validation.taskMax"),
  assigneeId: emptyToNull(z.string().trim().min(1).nullable()),
  assigneeName: emptyToNull(
    z.string().trim().min(2, "meetings.validation.assigneeMin").max(120, "meetings.validation.assigneeMax").nullable(),
  ),
  dueDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "meetings.validation.dueDateInvalid").nullable(),
  ),
  decisionId: emptyToNull(z.string().trim().min(1).nullable()),
};

export const actionItemAddSchema = z.object({ meetingId: z.string().trim().min(1), ...baseFields });

export const actionItemUpdateSchema = z.object({ id: z.string().trim().min(1), ...baseFields });

export const actionItemSetStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["OPEN", "DONE"]),
});

export const actionItemDeleteSchema = z.object({ id: z.string().trim().min(1) });

export type ActionItemAddInput = z.infer<typeof actionItemAddSchema>;
export type ActionItemUpdateInput = z.infer<typeof actionItemUpdateSchema>;
export type ActionItemSetStatusInput = z.infer<typeof actionItemSetStatusSchema>;
export type ActionItemDeleteInput = z.infer<typeof actionItemDeleteSchema>;
