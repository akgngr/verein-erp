import { z } from "zod";

/**
 * Görev (aksiyon maddesi) şemaları (5. bölüm md. 10 ve 12).
 * KARAR: Sorumlu YA toplantının bir katılımcısı (assigneeAttendeeId) YA dışarıdan
 * biri (ad zorunlu; e-posta ve telefon isteğe bağlı) YA hiçbiri olabilir.
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
  assigneeAttendeeId: emptyToNull(z.string().trim().min(1).nullable()),
  assigneeName: emptyToNull(
    z.string().trim().min(2, "meetings.validation.assigneeMin").max(120, "meetings.validation.assigneeMax").nullable(),
  ),
  assigneeEmail: emptyToNull(
    z.string().trim().pipe(z.email("validation.emailInvalid").max(200)).nullable(),
  ),
  assigneePhone: emptyToNull(z.string().trim().max(40, "meetings.validation.assigneePhoneMax").nullable()),
  dueDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "meetings.validation.dueDateInvalid").nullable(),
  ),
  decisionId: emptyToNull(z.string().trim().min(1).nullable()),
};

/** Dışarıdan sorumlunun iletişim bilgisi adı olmadan girilemez. */
function contactNeedsName(value: { assigneeAttendeeId: string | null; assigneeName: string | null; assigneeEmail: string | null; assigneePhone: string | null }) {
  return value.assigneeAttendeeId !== null || value.assigneeName !== null || (!value.assigneeEmail && !value.assigneePhone);
}
const contactNeedsNameIssue = { message: "meetings.validation.assigneeNameRequired", path: ["assigneeName"] };

export const actionItemAddSchema = z
  .object({ meetingId: z.string().trim().min(1), ...baseFields })
  .refine(contactNeedsName, contactNeedsNameIssue);

export const actionItemUpdateSchema = z
  .object({ id: z.string().trim().min(1), ...baseFields })
  .refine(contactNeedsName, contactNeedsNameIssue);

export const actionItemSetStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["OPEN", "DONE"]),
});

export const actionItemDeleteSchema = z.object({ id: z.string().trim().min(1) });

export type ActionItemAddInput = z.infer<typeof actionItemAddSchema>;
export type ActionItemUpdateInput = z.infer<typeof actionItemUpdateSchema>;
export type ActionItemSetStatusInput = z.infer<typeof actionItemSetStatusSchema>;
export type ActionItemDeleteInput = z.infer<typeof actionItemDeleteSchema>;
