import { z } from "zod";

/** Kategori şemaları (§ 8 md. 12): yön + alan ilk fişten sonra DEĞİŞTİRİLEMEZ. */

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Kategori adı en az 2 karakter olmalıdır.")
    .max(150, "Kategori adı en fazla 150 karakter olabilir."),
  direction: z.enum(["INCOME", "EXPENSE"]),
  sphere: z.enum(["IDEELL", "ASSET_MANAGEMENT", "PURPOSE_OPERATION", "ECONOMIC_OPERATION"]),
  helpText: z
    .string()
    .trim()
    .max(500, "Yardım metni en fazla 500 karakter olabilir.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
  isActive: z.boolean().optional(),
});

export const categoryIdSchema = z.object({ id: z.string().min(1) });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
