/**
 * ACC-8 AfA (amortisman) hesapları — saf. EÜR'de varlık alımı gider değildir; yerine yıllık AfA yazılır.
 * - GWG (§ 6 Abs. 2 EStG): net ≤ 800 € → alım yılında tamamı.
 * - Sammelposten (§ 6 Abs. 2a EStG): net 250,01–1.000 € → alım yılı dahil 5 yıl, yılda 1/5 (ay oranı yok).
 * - Doğrusal (§ 7 Abs. 1 EStG): faydalı ömür (ay) boyunca, alım ayından itibaren aylık pro rata.
 */
export type AssetMethod = "LINEAR" | "GWG" | "POOL";
export type AssetInput = { costCents: number; acquisitionDate: Date; usefulLifeMonths: number; method: AssetMethod; disposalDate: Date | null };

export const GWG_LIMIT_CENTS = 80_000;
export const POOL_RANGE_CENTS = [25_001, 100_000] as const;

/** Net tutara göre varsayılan yöntem önerisi. */
export function suggestMethod(costCents: number): AssetMethod {
  return costCents <= GWG_LIMIT_CENTS ? "GWG" : "LINEAR";
}

/** Yıl başına AfA (cent); son yıl kalan kuruşları alır, toplam = maliyet. */
export function depreciationSchedule(asset: AssetInput): Array<{ year: number; amountCents: number; bookValueCents: number }> {
  const startYear = asset.acquisitionDate.getUTCFullYear();
  const rows: Array<{ year: number; amountCents: number; bookValueCents: number }> = [];
  if (asset.method === "GWG") return [{ year: startYear, amountCents: asset.costCents, bookValueCents: 0 }];
  if (asset.method === "POOL") {
    let rest = asset.costCents;
    for (let index = 0; index < 5; index++) {
      const amount = index === 4 ? rest : Math.round(asset.costCents / 5);
      rest -= amount;
      rows.push({ year: startYear + index, amountCents: amount, bookValueCents: rest });
    }
    return rows;
  }
  const months = Math.max(1, asset.usefulLifeMonths);
  const monthly = asset.costCents / months;
  let month = asset.acquisitionDate.getUTCMonth(); // 0-11, alım ayı dahil
  let year = startYear;
  let used = 0;
  let booked = 0;
  while (used < months) {
    const inYear = Math.min(12 - month, months - used);
    used += inYear;
    const target = used === months ? asset.costCents : Math.round(monthly * used);
    const amount = target - booked;
    booked = target;
    rows.push({ year, amountCents: amount, bookValueCents: asset.costCents - booked });
    year += 1;
    month = 0;
  }
  return rows;
}

/** Bir yılın AfA'sı; satış/hurdaya çıkarma yılında kalan defter değeri tamamen giderleşir (Pool hariç). */
export function depreciationForYear(asset: AssetInput, year: number): { amountCents: number; bookValueEndCents: number } {
  const schedule = depreciationSchedule(asset);
  const disposalYear = asset.disposalDate?.getUTCFullYear() ?? null;
  if (disposalYear !== null && asset.method !== "POOL" && year > disposalYear) return { amountCents: 0, bookValueEndCents: 0 };
  if (disposalYear !== null && asset.method !== "POOL" && year === disposalYear) {
    const before = schedule.filter((row) => row.year < year).reduce((sum, row) => sum + row.amountCents, 0);
    return { amountCents: asset.costCents - before, bookValueEndCents: 0 };
  }
  const row = schedule.find((item) => item.year === year);
  const last = schedule.filter((item) => item.year <= year).at(-1);
  return { amountCents: row?.amountCents ?? 0, bookValueEndCents: last ? last.bookValueCents : asset.costCents };
}

/** ACC-8 götürü giderler (2024+ değerleri; kullanıcı yıl bazında doğrular). */
export const FLAT_RATES = {
  HOME_OFFICE: { perUnitCents: 600, yearlyCapCents: 126_000 }, // Tagespauschale 6 €/gün, en fazla 1.260 €/yıl
  MILEAGE: { perUnitCents: 30, yearlyCapCents: null }, // Dienstreise PKW 0,30 €/km
  MEALS_8H: { perUnitCents: 1400, yearlyCapCents: null }, // Verpflegungsmehraufwand > 8 h
  MEALS_24H: { perUnitCents: 2800, yearlyCapCents: null }, // 24 h
} as const;
export type FlatRateKind = keyof typeof FLAT_RATES;

export function flatRateAmountCents(kind: FlatRateKind, quantity: number): number {
  return Math.round(FLAT_RATES[kind].perUnitCents * quantity);
}

/** Yıl toplamı, tavan uygulanmış (ör. Homeoffice 1.260 €). */
export function flatRateYearTotals(entries: Array<{ kind: FlatRateKind; amountCents: number }>): Record<FlatRateKind, { totalCents: number; cappedCents: number }> {
  const result = {} as Record<FlatRateKind, { totalCents: number; cappedCents: number }>;
  for (const kind of Object.keys(FLAT_RATES) as FlatRateKind[]) {
    const total = entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.amountCents, 0);
    const cap = FLAT_RATES[kind].yearlyCapCents;
    result[kind] = { totalCents: total, cappedCents: cap === null ? total : Math.min(total, cap) };
  }
  return result;
}
