import { z } from "zod";

/**
 * Katılımcı şemaları (5. bölüm md. 8 ve 12).
 * KARAR: userId ve name birlikte doğrulanır; kullanıcı katılımcısında name
 * sunucuda kullanıcının adından yeniden üretilir (anlık görüntü).
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const attendeeRoleSchema = z.enum(["CHAIRPERSON", "SECRETARY", "MEMBER", "GUEST"]);
export const attendanceStatusSchema = z.enum(["INVITED", "PRESENT", "ABSENT_EXCUSED", "ABSENT"]);

/** Kullanıcı ekleme: birden fazla kullanıcı tek seferde eklenebilir (5. bölüm md. 8). */
export const attendeeAddUsersSchema = z.object({
  meetingId: z.string().trim().min(1),
  userIds: z.array(z.string().trim().min(1)).min(1, "En az bir kullanıcı seçin."),
  role: attendeeRoleSchema.default("MEMBER"),
});

export const attendeeAddGuestSchema = z.object({
  meetingId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Konuk adı en az 2 karakter olmalıdır.")
    .max(120, "Konuk adı en fazla 120 karakter olabilir."),
  role: z.enum(["GUEST", "MEMBER"]).default("GUEST"),
});

export const attendeeUpdateSchema = z.object({
  id: z.string().trim().min(1),
  role: attendeeRoleSchema,
  attendance: attendanceStatusSchema,
  note: emptyToNull(z.string().trim().max(200, "Not en fazla 200 karakter olabilir.").nullable()),
});

export const attendeeRemoveSchema = z.object({ id: z.string().trim().min(1) });

export const attendeeMarkAllPresentSchema = z.object({ meetingId: z.string().trim().min(1) });

export type AttendeeAddUsersInput = z.infer<typeof attendeeAddUsersSchema>;
export type AttendeeAddGuestInput = z.infer<typeof attendeeAddGuestSchema>;
export type AttendeeUpdateInput = z.infer<typeof attendeeUpdateSchema>;
export type AttendeeRemoveInput = z.infer<typeof attendeeRemoveSchema>;
export type AttendeeMarkAllPresentInput = z.infer<typeof attendeeMarkAllPresentSchema>;
