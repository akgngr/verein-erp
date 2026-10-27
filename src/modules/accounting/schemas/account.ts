import { z } from "zod";

/** Hesap şemaları (§ 8 md. 11): ad benzersiz; açılış bakiyesi/tarihi yalnızca
 * fişi olmayan hesapta düzenlenebilir (aksiyonda denetlenir). */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const accountCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Hesap adı en az 2 karakter olmalıdır.")
    .max(100, "Hesap adı en fazla 100 karakter olabilir."),
  type: z.enum(["CASH", "BANK", "OTHER"]),
  openingBalance: z
    .string()
    .trim()
    .max(14, "Tutar çok büyük.")
    .default("0"),
  openingDate: z
    .string()
    .trim()
    .regex(DATE_ONLY, "Geçerli bir açılış tarihi girin."),
});

export const accountUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Hesap adı en az 2 karakter olmalıdır.")
    .max(100, "Hesap adı en fazla 100 karakter olabilir."),
  type: z.enum(["CASH", "BANK", "OTHER"]),
  openingBalance: z.string().trim().max(14).default("0"),
  openingDate: z.string().trim().regex(DATE_ONLY, "Geçerli bir açılış tarihi girin."),
  isActive: z.boolean().optional(),
});

export const accountIdSchema = z.object({ id: z.string().min(1) });

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export { emptyToNull as accountEmptyToNull };
