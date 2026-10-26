import { z } from "zod";

/** İşlem notu şeması (5. bölüm md. 9): salt eklenir, 1–2000 karakter. */
export const addNoteSchema = z.object({
  documentId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Not boş olamaz.")
    .max(2000, "Not en fazla 2000 karakter olabilir."),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
