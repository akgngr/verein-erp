import { z } from "zod";

/** Yıl kapanışı/açılışı şemaları (§ 8 md. 8): kilidi açma gerekçesi zorunlu. */

export const closeYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export const unlockYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  reason: z
    .string()
    .trim()
    .min(5, "Gerekçe en az 5 karakter olmalıdır.")
    .max(300, "Gerekçe en fazla 300 karakter olabilir."),
});

export type CloseYearInput = z.infer<typeof closeYearSchema>;
export type UnlockYearInput = z.infer<typeof unlockYearSchema>;
