import { z } from "zod";

/** Proje şemaları (§ 8 md. 13): ad benzersiz; silme yok — pasifleştirme. */

export const projectCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "accounting.validation.projectNameMin")
    .max(150, "accounting.validation.projectNameMax"),
  note: z
    .string()
    .trim()
    .max(500, "accounting.validation.noteMax")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const projectUpdateSchema = projectCreateSchema.extend({
  isActive: z.boolean().optional(),
});

export const projectIdSchema = z.object({ id: z.string().min(1) });

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
