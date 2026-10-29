import { z } from "zod";

/**
 * Aidat ödemesi doğrulama şemaları (Faz 4, 4.6 — KARAR: aidat altyapısı Faz 3'te
 * inşa edilmemişti; minimum ödeme + makbuz + iptal burada kurulur).
 *
 * KARAR: Makbuz numarası (receiptNumber) ve sıra şemada YOKTUR — sunucuda sayacın
 * atomik artırılmasıyla üretilir (membership-number kalıbı) ve sonradan değişmez.
 * Tutar "12,50" / "12.50" kabul edilir; sunucuda integer cent'e çevrilir
 * (shared/money.toCents) ve Decimal(12,2) kolonuna yazılır.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Aidat yılı: makul aralık 2000..gelecek yıl (KARAR: serbest metin değil). */
const dueYearSchema = z.coerce
  .number()
  .int("Aidat yılı tam sayı olmalıdır.")
  .min(2000, "Aidat yılı 2000'den küçük olamaz.")
  .max(new Date().getFullYear() + 1, "Aidat yılı gelecek yıldan büyük olamaz.");

export const paymentCreateSchema = z.object({
  memberId: z.string().min(1),
  dueYear: dueYearSchema,
  /** Formda "12,50" / "12.50" string; sunucuda toCents ile doğrulanır. */
  amount: z
    .string()
    .trim()
    .min(1, "members.validation.amountRequired")
    .max(14, "members.validation.amountTooLarge"),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  paidAt: z
    .string()
    .trim()
    .min(1, "members.validation.paymentDateRequired")
    .regex(DATE_ONLY, "members.validation.paymentDateInvalid"),
  reference: emptyToNull(
    z.string().trim().max(100, "members.validation.referenceMax").nullable(),
  ),
});

export const paymentVoidSchema = z.object({
  id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "members.validation.voidReasonMin")
    .max(300, "members.validation.voidReasonMax"),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentVoidInput = z.infer<typeof paymentVoidSchema>;
