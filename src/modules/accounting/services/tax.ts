import type { Prisma } from "@prisma/client";

import { centsToDecimalString } from "@/shared/money";

/**
 * ACC-1 vergi temeli. Fişte brüt tutar girilir; net ve KDV (gelirde Umsatzsteuer, giderde
 * Vorsteuer) buradan hesaplanır ve saklanır: amount = netAmount + taxAmount (DB CHECK kısıtı).
 * § 19 UStG küçük işletmede KDV hesaplanmaz ve indirilemez → oran her zaman 0.
 */
export const TAX_RATES = [0, 7, 19] as const;
export type TaxRate = (typeof TAX_RATES)[number];
export const isTaxRate = (value: number): value is TaxRate => (TAX_RATES as readonly number[]).includes(value);

export type TaxSettings = {
  chartOfAccounts: "SKR03" | "SKR04";
  smallBusiness: boolean;
  taxMethod: "IST" | "SOLL";
  vatPeriod: "MONTH" | "QUARTER" | "YEAR";
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = { chartOfAccounts: "SKR03", smallBusiness: false, taxMethod: "IST", vatPeriod: "QUARTER" };

/** Brütten net + KDV (kuruş). Net yuvarlanır, KDV = brüt − net (kuruş kaybı olmaz). */
export function splitGross(grossCents: number, rate: number): { netCents: number; taxCents: number } {
  if (!rate) return { netCents: grossCents, taxCents: 0 };
  const netCents = Math.round((grossCents * 100) / (100 + rate));
  return { netCents, taxCents: grossCents - netCents };
}

/** Netten brüt + KDV (fatura kalemleri net girilir). */
export function grossFromNet(netCents: number, rate: number): { grossCents: number; taxCents: number } {
  const taxCents = Math.round((netCents * rate) / 100);
  return { grossCents: netCents + taxCents, taxCents };
}

/** Küçük işletmede oran 0'a zorlanır. */
export const effectiveTaxRate = (rate: number, settings: Pick<TaxSettings, "smallBusiness">): TaxRate =>
  settings.smallBusiness || !isTaxRate(rate) ? 0 : rate;

/** Fiş yazımı için KDV sütunları (brütten). */
export function taxColumnsFromGross(grossCents: number, rate: number) {
  const { netCents, taxCents } = splitGross(grossCents, rate);
  return { taxRate: rate, netAmount: centsToDecimalString(netCents), taxAmount: centsToDecimalString(taxCents) };
}

export async function getTaxSettings(db: Pick<Prisma.TransactionClient, "accountingSettings">): Promise<TaxSettings> {
  const row = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return DEFAULT_TAX_SETTINGS;
  return {
    chartOfAccounts: row.chartOfAccounts === "SKR04" ? "SKR04" : "SKR03",
    smallBusiness: row.smallBusiness,
    taxMethod: row.taxMethod === "SOLL" ? "SOLL" : "IST",
    vatPeriod: row.vatPeriod === "MONTH" ? "MONTH" : row.vatPeriod === "YEAR" ? "YEAR" : "QUARTER",
  };
}
