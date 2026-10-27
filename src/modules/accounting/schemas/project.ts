import { z } from "zod";

/** Proje şemaları (§ 8 md. 13): ad benzersiz; silme yok — pasifleştirme. */

export const projectCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Proje adı en az 2 karakter olmalıdır.")
    .max(150, "Proje adı en fazla 150 karakter olabilir."),
  note: z
    .string()
    .trim()
    .max(500, "Not en fazla 500 karakter olabilir.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const projectUpdateSchema = projectCreateSchema.extend({
  isActive: z.boolean().optional(),
});

export const projectIdSchema = z.object({ id: z.string().min(1) });

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
