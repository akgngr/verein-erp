import { z } from "zod";

/**
 * Üyelik türü konfigürasyonu doğrulama şeması (Faz 3 eklemeleri).
 *
 * KARAR: Tür eklenemez/silinmez (enum sabittir — bkz. prisma şema karar notu);
 * yalnızca yıllık aidat tutarı ve aktiflik güncellenir. Tutar "" / null =
 * henüz belirlenmedi (aidat üretimi o türü atlar); "0" = aidat yok.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const memberTypeConfigUpdateSchema = z.object({
  type: z.enum(["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"]),
  annualDue: emptyToNull(
    z.string().trim().max(14, "members.validation.amountTooLarge").nullable(),
  ),
  isActive: z.boolean(),
});

export type MemberTypeConfigUpdateInput = z.infer<typeof memberTypeConfigUpdateSchema>;
