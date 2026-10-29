import { z } from "zod";

/** Üye işlem notu şeması (timeline kalıbı, documents ile aynı). */
export const addNoteSchema = z.object({
  memberId: z.string().min(1, "members.validation.memberMissing"),
  body: z
    .string()
    .trim()
    .min(1, "members.validation.noteEmpty")
    .max(2000, "members.validation.noteMax"),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
