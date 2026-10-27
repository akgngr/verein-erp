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

export const donationCreateSchema = z
  .object({
    donorId: z.string().trim().min(1, "Bağışçı seçin."),
    receivedAt: z
      .string()
      .trim()
      .min(1, "Bağış tarihi zorunludur.")
      .regex(DATE_ONLY, "Geçerli bir tarih girin."),
    amount: z.string().trim().min(1, "Tutar zorunludur.").max(14, "Tutar çok büyük."),
    method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "PAYPAL", "REIMBURSEMENT_WAIVER", "OTHER"]),
    reference: emptyToNull(z.string().trim().max(100, "Referans en fazla 100 karakter olabilir.").nullable()),
    purposeNote: emptyToNull(z.string().trim().max(300, "Amaç notu en fazla 300 karakter olabilir.").nullable()),
    // Aufwandsspende (§ 11 md. 4):
    waivedReimbursement: z.boolean().default(false),
    claimBasis: emptyToNull(z.string().trim().max(300, "Dayanak en fazla 300 karakter olabilir.").nullable()),
    waiverDeclaredAt: emptyToNull(z.string().trim().regex(DATE_ONLY, "Geçerli bir tarih girin.").nullable()),
    expenseCategoryId: emptyToNull(z.string().trim().min(1).nullable()),
  })
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
          message: "Önceden doğmuş talebin dayanağı zorunludur (en az 5 karakter).",
        });
      }
      if (!data.waiverDeclaredAt) {
        ctx.addIssue({
          code: "custom",
          path: ["waiverDeclaredAt"],
          message: "Vazgeçimin beyan tarihi zorunludur.",
        });
      }
      if (!data.expenseCategoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["expenseCategoryId"],
          message: "Gider kategorisi zorunludur (Aufwandsspende gideri).",
        });
      }
    } else if (data.method === "REIMBURSEMENT_WAIVER") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "Bu yöntem yalnızca Aufwandsspende ile kullanılır.",
      });
    }
  });

export const donationUpdateSchema = donationCreateSchema.omit({ donorId: true }).extend({
  id: z.string().min(1),
  /** Eşzamanlılık koruması: formun taşıdığı kaydın updatedAt'i. */
  updatedAt: z.string().min(1, "Kayıt sürümü eksik."),
});

/** Bağış iptali (§ 11 md. 7): neden 5-300. */
export const donationCancelSchema = z.object({
  id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "İptal nedeni en az 5 karakter olmalıdır.")
    .max(300, "İptal nedeni en fazla 300 karakter olabilir."),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;
export type DonationUpdateInput = z.infer<typeof donationUpdateSchema>;
export type DonationCancelInput = z.infer<typeof donationCancelSchema>;
