import { z } from "zod";

/**
 * Bildirim üretimi/iptali şemaları (§ 11 md. 9-10). Tarihler YYYY-MM-DD;
 * toplu üretim alıcı listesiyle gelir.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Tek bağış bildirimi (§ 11 md. 9 md. 1). */
export const issueSingleDonationSchema = z.object({
  kind: z.literal("SINGLE"),
  content: z.literal("DONATION"),
  donationId: z.string().min(1),
});

/** Bağışçıya toplu (Sammelbestätigung; § 11 md. 9 md. 2): dönem + seçilen ögeler. */
export const issueCollectiveDonationSchema = z.object({
  kind: z.literal("COLLECTIVE"),
  content: z.literal("DONATION"),
  donorId: z.string().min(1),
  periodFrom: z.string().trim().regex(DATE_ONLY, "Geçerli bir dönem başlangıcı girin."),
  periodTo: z.string().trim().regex(DATE_ONLY, "Geçerli bir dönem sonu girin."),
  donationIds: z.array(z.string().min(1)).min(1, "En az bir bağış seçin.").max(200),
});

/** Aidat bildirimi (§ 11 md. 9 md. 3): tek üye, takvim yılı. */
export const issueMembershipFeeSchema = z.object({
  kind: z.enum(["SINGLE", "COLLECTIVE"]),
  content: z.literal("MEMBERSHIP_FEE"),
  memberId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const issueConfirmationSchema = z.discriminatedUnion("kind", [
  issueSingleDonationSchema,
  issueCollectiveDonationSchema,
  issueMembershipFeeSchema,
]);

/** Bildirim iptali (§ 11 md. 10): neden 5-300. */
export const cancelConfirmationSchema = z.object({
  id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "İptal nedeni en az 5 karakter olmalıdır.")
    .max(300, "İptal nedeni en fazla 300 karakter olabilir."),
});

/** Yıllık toplu üretim (§ 11 md. 9 md. 4): alıcı başına bir bildirim. */
export const issueBatchSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  content: z.enum(["DONATION", "MEMBERSHIP_FEE"]),
  /** Bağış için donor id'leri; aidat için member id'leri. */
  recipientIds: z.array(z.string().min(1)).min(1).max(200),
});

export type IssueConfirmationInput = z.infer<typeof issueConfirmationSchema>;
export type CancelConfirmationInput = z.infer<typeof cancelConfirmationSchema>;
export type IssueBatchInput = z.infer<typeof issueBatchSchema>;
