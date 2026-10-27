import { z } from "zod";

/** Üye işlem notu şeması (timeline kalıbı, documents ile aynı). */
export const addNoteSchema = z.object({
  memberId: z.string().min(1, "Üye bilgisi eksik."),
  body: z
    .string()
    .trim()
    .min(1, "Not boş olamaz.")
    .max(2000, "Not en fazla 2000 karakter olabilir."),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
