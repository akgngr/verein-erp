import { z } from "zod";

/** İşlem notu şeması (5. bölüm md. 9): salt eklenir, 1–2000 karakter. */
export const addNoteSchema = z.object({
  documentId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "documents.validation.noteEmpty")
    .max(2000, "documents.validation.noteMax"),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
