import { z } from "zod";

/**
 * Durum değişikliği şeması (5. bölüm md. 3).
 * KARAR: Yeniden açma (APPROVED → HELD) gerekçe zorunludur (5-500 karakter)
 * ve gerekçe denetim kaydına yazılır; onaylama gerekçesizdir.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const changeStatusSchema = z.object({
  meetingId: z.string().trim().min(1),
  status: z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]),
  reason: emptyToNull(
    z.string().trim().min(5, "meetings.validation.reasonMin").max(500, "meetings.validation.reasonMax").nullable(),
  ),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
