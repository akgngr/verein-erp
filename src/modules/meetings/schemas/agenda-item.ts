import { z } from "zod";

/**
 * Gündem maddesi şemaları (5. bölüm md. 7 ve 12).
 * Alt kayıtlar last-write-wins çalışır; güncellemede updatedAt istenmez
 * (5. bölüm md. 6 — KARAR).
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const agendaItemAddSchema = z.object({
  meetingId: z.string().trim().min(1),
  title: z
    .string()
    .trim()
    .min(2, "Gündem maddesi en az 2 karakter olmalıdır.")
    .max(200, "Gündem maddesi en fazla 200 karakter olabilir."),
  description: emptyToNull(
    z.string().trim().max(2000, "Planlanan içerik en fazla 2000 karakter olabilir.").nullable(),
  ),
});

export const agendaItemUpdateSchema = z.object({
  id: z.string().trim().min(1),
  title: z
    .string()
    .trim()
    .min(2, "Gündem maddesi en az 2 karakter olmalıdır.")
    .max(200, "Gündem maddesi en fazla 200 karakter olabilir."),
  description: emptyToNull(
    z.string().trim().max(2000, "Planlanan içerik en fazla 2000 karakter olabilir.").nullable(),
  ),
});

export const agendaItemDeleteSchema = z.object({ id: z.string().trim().min(1) });

export const agendaItemMoveSchema = z.object({
  id: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
});

export const agendaDiscussionUpdateSchema = z.object({
  id: z.string().trim().min(1),
  discussion: emptyToNull(
    z.string().trim().max(10000, "Görüşme metni en fazla 10000 karakter olabilir.").nullable(),
  ),
});

export type AgendaItemAddInput = z.infer<typeof agendaItemAddSchema>;
export type AgendaItemUpdateInput = z.infer<typeof agendaItemUpdateSchema>;
export type AgendaItemDeleteInput = z.infer<typeof agendaItemDeleteSchema>;
export type AgendaItemMoveInput = z.infer<typeof agendaItemMoveSchema>;
export type AgendaDiscussionUpdateInput = z.infer<typeof agendaDiscussionUpdateSchema>;
