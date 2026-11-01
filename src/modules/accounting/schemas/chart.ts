import { z } from "zod";

/**
 * Hesap planı alanları (ACC-1). Boş metin → null ("numara yok"); alan hiç gönderilmezse
 * (undefined) eylem mevcut değere dokunmaz (ör. aktif/pasif düğmesi yalnızca birkaç alan yollar).
 */
export const accountNumberSchema = z.preprocess(
  (value) => (typeof value === "string" ? (value.trim() === "" ? null : value.trim()) : value),
  z.string().regex(/^\d{4,8}$/, "accounting.validation.accountNumberInvalid").nullable().optional(),
);

export const defaultTaxRateSchema = z.coerce
  .number()
  .int()
  .refine((value) => [0, 7, 19].includes(value), "accounting.validation.taxRateInvalid")
  .optional();

/** undefined → alan güncellenmez. */
export const definedOnly = <T extends Record<string, unknown>>(values: T): Partial<T> =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
