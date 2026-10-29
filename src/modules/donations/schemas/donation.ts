import { z } from "zod";

/**
 * Bağış doğrulama (§ 11 md. 3-4): tarih kısıtları, tutar (toCents), yöntem,
 * Aufwandsspende zorunlu alanları şemada; sunucu ek iş kurallarını uygular.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const donationBaseSchema = z.object({
    donorId: z.string().trim().min(1, "donations.validation.selectDonor"),
    receivedAt: z
      .string()
      .trim()
      .min(1, "donations.validation.dateRequired")
      .regex(DATE_ONLY, "donations.validation.dateInvalid"),
    amount: z.string().trim().min(1, "donations.validation.amountRequired").max(14, "donations.validation.amountTooLarge"),
    method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "PAYPAL", "REIMBURSEMENT_WAIVER", "OTHER"]),
    reference: emptyToNull(z.string().trim().max(100, "donations.validation.referenceMax").nullable()),
    purposeNote: emptyToNull(z.string().trim().max(300, "donations.validation.purposeMax").nullable()),
    // Aufwandsspende (§ 11 md. 4):
    waivedReimbursement: z.boolean().default(false),
    claimBasis: emptyToNull(z.string().trim().max(300, "donations.validation.basisMax").nullable()),
    waiverDeclaredAt: emptyToNull(z.string().trim().regex(DATE_ONLY, "donations.validation.dateInvalid").nullable()),
    expenseCategoryId: emptyToNull(z.string().trim().min(1).nullable()),
  });

export const donationCreateSchema = donationBaseSchema
  .superRefine((data, ctx) => {
    if (data.waivedReimbursement) {
      // Yöntem REIMBURSEMENT_WAIVER'a zorlanır (§ 11 md. 4); şemada da doğrulanır.
      if (data.method !== "REIMBURSEMENT_WAIVER") {
        ctx.addIssue({
          code: "custom",
          path: ["method"],
          message: "Aufwandsspende için yöntem 'REIMBURSEMENT_WAIVER' olmalıdır.",
        });
      }
      if (!data.claimBasis || data.claimBasis.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["claimBasis"],
          message: "donations.validation.basisRequired",
        });
      }
      if (!data.waiverDeclaredAt) {
        ctx.addIssue({
          code: "custom",
          path: ["waiverDeclaredAt"],
          message: "donations.validation.waiverDateRequired",
        });
      }
      if (!data.expenseCategoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["expenseCategoryId"],
          message: "donations.validation.expenseCategoryRequired",
        });
      }
    } else if (data.method === "REIMBURSEMENT_WAIVER") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "donations.validation.waiverMethodOnly",
      });
    }
  });

// KARAR: zod v4 — refine edilmiş şemadan .omit() çağrılamaz; update şeması
// refine'siz taban şemadan türetilir, koşul kuralı sunucuda yeniden uygulanır.
export const donationUpdateSchema = donationBaseSchema.omit({ donorId: true }).extend({
  id: z.string().min(1),
  /** Eşzamanlılık koruması: formun taşıdığı kaydın updatedAt'i. */
  updatedAt: z.string().min(1, "donations.validation.versionMissing"),
});

/** Bağış iptali (§ 11 md. 7): neden 5-300. */
export const donationCancelSchema = z.object({
  id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "donations.validation.cancelReasonMin")
    .max(300, "donations.validation.cancelReasonMax"),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;
export type DonationUpdateInput = z.infer<typeof donationUpdateSchema>;
export type DonationCancelInput = z.infer<typeof donationCancelSchema>;
