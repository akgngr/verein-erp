import { z } from "zod";

/** Muhasebe ayarları şeması (§ 11.7): aidat kategorisi + kasa/banka hesabı. */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const accountingSettingsSchema = z.object({
  memberFeeCategoryId: emptyToNull(z.string().trim().min(1, "accounting.validation.feeCategoryRequired").nullable()),
  cashAccountId: emptyToNull(z.string().trim().min(1, "accounting.validation.cashAccountRequired").nullable()),
  bankAccountId: emptyToNull(z.string().trim().min(1, "accounting.validation.bankAccountRequired").nullable()),
  // Faz 5 (§ 6): bağış kategorisi — aktif INCOME kategorisi olmalı (aksiyonda).
  donationCategoryId: emptyToNull(z.string().trim().min(1, "accounting.validation.donationCategoryRequired").nullable()),
});

/** ACC-1 vergi ayarları. */
export const taxSettingsSchema = z.object({
  chartOfAccounts: z.enum(["SKR03", "SKR04"]),
  smallBusiness: z.boolean(),
  taxMethod: z.enum(["IST", "SOLL"]),
  vatPeriod: z.enum(["MONTH", "QUARTER", "YEAR"]),
  // ACC-2: DATEV başlığı (boş = henüz girilmedi; dışa aktarımda zorunlu).
  datevConsultantNo: z.string().trim().refine((value) => value === "" || /^\d{4,7}$/.test(value), "accounting.validation.consultantNoInvalid").default(""),
  datevClientNo: z.string().trim().refine((value) => value === "" || /^\d{1,5}$/.test(value), "accounting.validation.clientNoInvalid").default(""),
  datevTaxKeys: z.boolean().default(false),
  vatExtension: z.boolean().default(false),
});
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;

export type AccountingSettingsInput = z.infer<typeof accountingSettingsSchema>;

/** EI-4 e-fatura zorunluluk ayarı; ciro avro olarak girilir (boş = bilinmiyor). */
export const einvoiceSettingsSchema = z.object({
  mode: z.enum(["AUTO", "ALWAYS", "NEVER"]),
  previousYearRevenue: z.string().trim().refine((value) => value === "" || parseEuroToCents(value) !== null, "accounting.einvoice.obligation.errors.revenue"),
});

/** "1.234.567,89" / "1234567.89" / "900000" → cent; geçersizse null. */
export function parseEuroToCents(value: string): number | null {
  const raw = value.replace(/\s|€/g, "");
  if (!/^\d[\d.,]*$/.test(raw)) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount < 1e10 ? Math.round(amount * 100) : null;
}
