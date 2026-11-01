import { z } from "zod";

/**
 * Fiş doğrulama şemaları (Faz 4, § 8). Tarih "YYYY-MM-DD" string taşır
 * (FormDatePicker çıktısı); sunucuda UTC gece yarısı Date'e çevrilir.
 * Tutar string ("12,50"/"12.50"); sunucuda toCents ile integer cent'e çevrilir.
 *
 * KARAR: Fiş numarası (bookingNumber) ve sıra şemada YOKTUR — sunucuda sayacın
 * atomik artırılmasıyla üretilir ve sonradan değişmez (DB tetikleyicisi korur).
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const bookingDateSchema = z
  .string()
  .trim()
  .min(1, "accounting.validation.bookingDateRequired")
  .regex(DATE_ONLY, "accounting.validation.bookingDateInvalid");

/** Tutar: > 0, en fazla 2 ondalık, max 9.999.999,99 (§ 8 md. 4). */
export const bookingAmountSchema = z
  .string()
  .trim()
  .min(1, "accounting.validation.amountRequired")
  .max(14, "accounting.validation.amountTooLarge");

/** KDV oranı (yüzde); § 19 küçük işletmede sunucu 0'a zorlar. */
export const taxRateSchema = z.coerce
  .number()
  .int()
  .refine((value) => [0, 7, 19].includes(value), "accounting.validation.taxRateInvalid")
  .default(0);

const sharedTextFields = {
  description: z
    .string()
    .trim()
    .min(3, "accounting.validation.descriptionMin")
    .max(300, "accounting.validation.descriptionMax"),
  counterparty: emptyToNull(
    z.string().trim().max(150, "accounting.validation.counterpartyMax").nullable(),
  ),
  receiptReference: emptyToNull(
    z.string().trim().max(100, "accounting.validation.receiptMax").nullable(),
  ),
  projectId: emptyToNull(z.string().trim().min(1, "accounting.validation.projectInvalid").nullable()),
};

/** Gelir/gider fişi oluşturma (§ 8 md. 1). */
export const bookingIncomeExpenseSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  bookingDate: bookingDateSchema,
  accountId: z.string().trim().min(1, "accounting.validation.accountRequired"),
  categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
  ...sharedTextFields,
  amount: bookingAmountSchema,
  taxRate: taxRateSchema,
});

/** Virman fişi oluşturma (§ 8 md. 1): kategori/proje yok, hedef hesap zorunlu. */
export const bookingTransferSchema = z.object({
  type: z.literal("TRANSFER"),
  bookingDate: bookingDateSchema,
  accountId: z.string().trim().min(1, "accounting.validation.sourceRequired"),
  counterAccountId: z.string().trim().min(1, "accounting.validation.targetRequired"),
  ...sharedTextFields,
  amount: bookingAmountSchema,
});

/** Create için birleşik şema (form tek bileşen; ?tur=gelir|gider|virman). */
export const bookingCreateSchema = z.discriminatedUnion("type", [
  bookingIncomeExpenseSchema,
  bookingTransferSchema,
]);

/** Güncelleme (§ 8 md. 6): tür DEĞİŞTİRİLEMEZ; düzenlenebilir alanlar create ile aynı. */
export const bookingUpdateSchema = z.object({
  id: z.string().min(1),
  bookingDate: bookingDateSchema,
  accountId: z.string().trim().min(1, "accounting.validation.accountRequired"),
  counterAccountId: emptyToNull(z.string().trim().min(1).nullable()),
  categoryId: emptyToNull(z.string().trim().min(1).nullable()),
  ...sharedTextFields,
  amount: bookingAmountSchema,
  taxRate: taxRateSchema,
  /** Eşzamanlılık koruması: formun taşıdığı kaydın updatedAt'i. */
  updatedAt: z.string().min(1, "accounting.validation.versionMissing"),
});

/** Ters kayıt (Storno) (§ 8 md. 7): neden 5-300. */
export const bookingReverseSchema = z.object({
  id: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "accounting.validation.reasonMin")
    .max(300, "accounting.validation.reasonMax"),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type BookingReverseInput = z.infer<typeof bookingReverseSchema>;
