import { z } from "zod";

import { accountNumberSchema, defaultTaxRateSchema } from "./chart";

/** Kategori şemaları (§ 8 md. 12): yön + alan ilk fişten sonra DEĞİŞTİRİLEMEZ. */

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "accounting.validation.categoryNameMin")
    .max(150, "accounting.validation.categoryNameMax"),
  direction: z.enum(["INCOME", "EXPENSE"]),
  sphere: z.enum(["IDEELL", "ASSET_MANAGEMENT", "PURPOSE_OPERATION", "ECONOMIC_OPERATION"]),
  helpText: z
    .string()
    .trim()
    .max(500, "accounting.validation.helpMax")
    .optional()
    .transform((value) => (value ? value : undefined)),
  accountNumber: accountNumberSchema,
  defaultTaxRate: defaultTaxRateSchema,
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
  isActive: z.boolean().optional(),
});

export const categoryIdSchema = z.object({ id: z.string().min(1) });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
