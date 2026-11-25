import "server-only";

import { getSettings, listAccountOptions, listCategoryOptions, saveSettingsAction } from "@/modules/accounting/server";

import { planDefaultMappings } from "./setup-accounting-mappings-core";

export { DEFAULT_CATEGORY_NAMES, planDefaultMappings } from "./setup-accounting-mappings-core";

/**
 * #583: Kurulum sihirbazı muhasebe hazır ayarını uyguladıktan sonra Muhasebe ayarlarındaki BOŞ varsayılan
 * eşlemeleri doldurur: Kasse (CASH) → nakit, Bank (BANK) → banka, "Spenden" → bağış, "Mitgliedsbeiträge" →
 * aidat kategorisi. Önceden hesap ve kategoriler oluşuyor ama eşlenmiyordu; ilk bağış "Muhasebe ayarları
 * eksik" hatasıyla kaydedilemiyordu. Dolu eşlemeler korunur; kayıt muhasebenin kendi eylemiyle (doğrulama
 * ve denetim kaydı dahil) yazılır.
 */
export async function fillDefaultAccountingMappings(): Promise<{ filled: string[]; error: string | null }> {
  const [settings, accounts, categories] = await Promise.all([getSettings(), listAccountOptions(), listCategoryOptions("INCOME")]);
  const { next, filled } = planDefaultMappings(settings, accounts, categories);
  if (filled.length === 0) return { filled: [], error: null };
  const result = await saveSettingsAction(next);
  return result.ok ? { filled, error: null } : { filled: [], error: result.error };
}
