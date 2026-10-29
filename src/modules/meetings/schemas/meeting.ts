import { z } from "zod";

/**
 * Toplantı doğrulama şemaları (5. bölüm md. 12).
 *
 * KARAR: Tarih alanı "YYYY-MM-DD" string taşır (FormDatePicker çıktısı);
 * sunucu tarafında UTC gece yarısı Date'e çevrilir (bkz. utils.parseDateOnly).
 * Toplantı numarası (meetingNumber) şemalarda YOKTUR — numara sunucuda
 * üretilir, API üzerinden gönderilse de yok sayılır (5. bölüm md. 1).
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const meetingTypeSchema = z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]);

const baseFields = {
  title: z
    .string()
    .trim()
    .min(3, "meetings.validation.titleMin")
    .max(200, "meetings.validation.titleMax"),
  meetingDate: z
    .string()
    .trim()
    .min(1, "meetings.validation.dateRequired")
    .regex(DATE_ONLY, "meetings.validation.dateInvalid"),
  startTime: emptyToNull(
    z.string().trim().regex(TIME_HH_MM, "meetings.validation.timeFormat").nullable(),
  ),
  endTime: emptyToNull(
    z.string().trim().regex(TIME_HH_MM, "meetings.validation.timeFormat").nullable(),
  ),
  location: emptyToNull(
    z.string().trim().max(200, "meetings.validation.locationMax").nullable(),
  ),
  quorumRequired: emptyToNull(
    z.coerce
      .number()
      .int("meetings.validation.quorumInt")
      .min(1, "meetings.validation.quorumMin")
      .max(500, "meetings.validation.quorumMax")
      .nullable(),
  ),
  description: emptyToNull(
    z.string().trim().max(2000, "meetings.validation.descriptionMax").nullable(),
  ),
};

/** endTime verilmişse startTime zorunlu ve endTime daha geç olmalıdır (5. bölüm md. 12). */
function refineTimeOrder<Data extends { startTime: string | null; endTime: string | null }>(
  data: Data,
  ctx: z.RefinementCtx,
): void {
  if (data.endTime && !data.startTime) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "meetings.validation.endNeedsStart",
    });
    return;
  }
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "meetings.validation.endAfterStart",
    });
  }
}

export const meetingCreateSchema = z
  .object({
    ...baseFields,
    type: meetingTypeSchema,
    // KARAR: copyFromMeetingId yalnızca create'te anlamlıdır; sunucu kaynak
    // toplantıyı tür ve silinmemişlik açısından yeniden doğrular (5. bölüm md. 11).
    copyFromMeetingId: emptyToNull(z.string().trim().min(1).nullable()),
  })
  .superRefine(refineTimeOrder);

export const meetingUpdateSchema = z.object({ ...baseFields, updatedAt: z.string().min(1) }).superRefine(refineTimeOrder);

export type MeetingCreateInput = z.infer<typeof meetingCreateSchema>;
export type MeetingUpdateInput = z.infer<typeof meetingUpdateSchema>;
