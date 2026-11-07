import "server-only";

import { getDb } from "@/shared/db";

/** SEPA-Lastschrift için alacaklı hesabı ve Gläubiger-ID (fatura ayarlarından). */
export async function getSepaCreditorSettings() {
  const row = await getDb().accountingInvoiceSettings.findUnique({ where: { id: "singleton" }, select: { iban: true, bic: true, sepaCreditorId: true } });
  return { iban: row?.iban ?? null, bic: row?.bic ?? null, creditorId: row?.sepaCreditorId ?? null };
}
