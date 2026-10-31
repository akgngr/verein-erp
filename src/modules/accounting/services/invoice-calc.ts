/**
 * Fatura tutarları (saf hesap): satır neti = miktar × birim fiyat (cent'e yuvarlanır);
 * KDV her oran için satır netlerinin toplamı üzerinden bir kez yuvarlanır (§ 14 Abs. 4 Nr. 8 UStG:
 * oran başına vergi tutarı).
 */
export type InvoiceLineInput = { quantity: number; unitPriceCents: number; taxRate: number };

export type InvoiceTotals = {
  lineTotals: number[];
  netCents: number;
  taxCents: number;
  grossCents: number;
  /** Oran → { net, vergi }; 0 oranı da listelenir. */
  byRate: { rate: number; netCents: number; taxCents: number }[];
};

export function lineNetCents(line: Pick<InvoiceLineInput, "quantity" | "unitPriceCents">): number {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  const lineTotals = lines.map(lineNetCents);
  const rates = new Map<number, number>();
  lines.forEach((line, index) => rates.set(line.taxRate, (rates.get(line.taxRate) ?? 0) + lineTotals[index]));
  const byRate = [...rates.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, netCents]) => ({ rate, netCents, taxCents: Math.round((netCents * rate) / 100) }));
  const netCents = lineTotals.reduce((sum, value) => sum + value, 0);
  const taxCents = byRate.reduce((sum, row) => sum + row.taxCents, 0);
  return { lineTotals, netCents, taxCents, grossCents: netCents + taxCents, byRate };
}
