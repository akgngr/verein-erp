import { z } from "zod";

/**
 * Bütçe şeması (§ 8 md. 16): yıl + kategori başına tek tutar. Kaydetme,
 * tüm değişen satırları TEK transaction'da yazar; boş/0 satırı siler.
 */

export const budgetSaveSchema = z.object({
  year: z.coerce
    .number()
    .int("Yıl tam sayı olmalıdır.")
    .min(2000, "Yıl 2000'den küçük olamaz.")
    .max(2100, "accounting.validation.yearInvalid"),
  /** Kategori id → tutar string ("1.234,56"); boş/0 = satır silinir. */
  lines: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        amount: z.string().trim().max(14).default(""),
      }),
    )
    .max(200, "accounting.validation.rowLimit"),
});

export const budgetYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type BudgetSaveInput = z.infer<typeof budgetSaveSchema>;
