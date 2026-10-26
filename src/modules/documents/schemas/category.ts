import { z } from "zod";

/** Kategori şemaları (8.5): ad benzersiz (büyük/küçük harf duyarsız, sunucuda kontrol), 2–60 karakter. */
export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Kategori adı en az 2 karakter olmalıdır.")
    .max(60, "Kategori adı en fazla 60 karakter olabilir."),
});

export const categoryUpdateSchema = categoryCreateSchema.extend({
  id: z.string().min(1),
});

export const categorySetActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategorySetActiveInput = z.infer<typeof categorySetActiveSchema>;
