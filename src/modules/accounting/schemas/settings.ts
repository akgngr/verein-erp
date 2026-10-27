import { z } from "zod";

/** Muhasebe ayarları şeması (§ 11.7): aidat kategorisi + kasa/banka hesabı. */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const accountingSettingsSchema = z.object({
  memberFeeCategoryId: emptyToNull(z.string().trim().min(1, "Aidat kategorisi seçin.").nullable()),
  cashAccountId: emptyToNull(z.string().trim().min(1, "Kasa hesabı seçin.").nullable()),
  bankAccountId: emptyToNull(z.string().trim().min(1, "Banka hesabı seçin.").nullable()),
  // Faz 5 (§ 6): bağış kategorisi — aktif INCOME kategorisi olmalı (aksiyonda).
  donationCategoryId: emptyToNull(z.string().trim().min(1, "Bağış kategorisi seçin.").nullable()),
});

export type AccountingSettingsInput = z.infer<typeof accountingSettingsSchema>;
