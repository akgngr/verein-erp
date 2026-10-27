import { z } from "zod";

/**
 * Yıllık aidat satırı doğrulama şemaları (Faz 3 eklemeleri).
 *
 * KARAR: Tutar "12,50" / "12.50" kabul edilir; sunucuda toCents ile integer
 * cent'e çevrilir (shared/money). Durum (status) şemada YOKTUR —OPEN/PARTIAL/
 * PAID recalculateDue tarafından türetilir; WAIVED yalnızca updateDue'daki
 * waived bayrağıyla verilir. Ödenen tutar girdi olarak alınmaz.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

/** İş emri kuralı: üretilebilir yıl aralığı geçen yıl .. gelecek yıl. */
const CURRENT_YEAR = new Date().getFullYear();

export const generateDuesSchema = z.object({
  year: z.coerce
    .number()
    .int("Yıl tam sayı olmalıdır.")
    .min(CURRENT_YEAR - 1, "Yıl en fazla bir önceki yıl olabilir.")
    .max(CURRENT_YEAR + 1, "Yıl en fazla gelecek yıl olabilir."),
  dueDate: z
    .string()
    .trim()
    .min(1, "Son ödeme tarihi zorunludur.")
    .regex(DATE_ONLY, "Geçerli bir son ödeme tarihi girin."),
  dryRun: z.boolean(),
});

export const dueAddSchema = z.object({
  memberId: z.string().min(1),
  year: z.coerce
    .number()
    .int("Yıl tam sayı olmalıdır.")
    .min(2000, "Yıl 2000'den küçük olamaz.")
    .max(CURRENT_YEAR + 1, "Yıl gelecek yıldan büyük olamaz."),
  amount: z
    .string()
    .trim()
    .min(1, "Tutar zorunludur.")
    .max(14, "Tutar çok büyük."),
  dueDate: z
    .string()
    .trim()
    .min(1, "Son ödeme tarihi zorunludur.")
    .regex(DATE_ONLY, "Geçerli bir son ödeme tarihi girin."),
  note: emptyToNull(
    z.string().trim().max(300, "Not en fazla 300 karakter olabilir.").nullable(),
  ),
});

export const dueUpdateSchema = z.object({
  id: z.string().min(1),
  amount: z
    .string()
    .trim()
    .min(1, "Tutar zorunludur.")
    .max(14, "Tutar çok büyük."),
  dueDate: z
    .string()
    .trim()
    .min(1, "Son ödeme tarihi zorunludur.")
    .regex(DATE_ONLY, "Geçerli bir son ödeme tarihi girin."),
  note: emptyToNull(
    z.string().trim().max(300, "Not en fazla 300 karakter olabilir.").nullable(),
  ),
  /** true = muaf işaretle (ödemesi yoksa), false = muafiyeti kaldır. */
  waived: z.boolean(),
});

export const dueDeleteSchema = z.object({
  id: z.string().min(1),
});

export type GenerateDuesInput = z.infer<typeof generateDuesSchema>;
export type DueAddInput = z.infer<typeof dueAddSchema>;
export type DueUpdateInput = z.infer<typeof dueUpdateSchema>;
export type DueDeleteInput = z.infer<typeof dueDeleteSchema>;
