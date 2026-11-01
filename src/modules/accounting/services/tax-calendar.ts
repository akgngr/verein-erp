/**
 * ACC-8 vergi takvimi (saf): UStVA (ayın/çeyreğin bitiminden sonraki 10'u; Dauerfristverlängerung
 * ile +1 ay), yıllık beyannameler (danışmansız: izleyen yılın 31 Temmuz'u). Hafta sonu → pazartesi.
 * Not: resmî tatiller ve özel süre uzatmaları (ör. COVID dönemi) dikkate alınmaz.
 */
export type Deadline = { key: "ustva" | "annualVat" | "incomeTax"; period: string; due: Date };

export function nextBusinessDay(date: Date): Date {
  const day = date.getUTCDay();
  const add = day === 6 ? 2 : day === 0 ? 1 : 0;
  return new Date(date.getTime() + add * 86_400_000);
}

export function taxDeadlines(year: number, options: { vatPeriod: "MONTH" | "QUARTER" | "YEAR"; extension: boolean; smallBusiness: boolean }): Deadline[] {
  const deadlines: Deadline[] = [];
  const shift = options.extension ? 1 : 0;
  if (!options.smallBusiness && options.vatPeriod !== "YEAR") {
    const step = options.vatPeriod === "MONTH" ? 1 : 3;
    for (let start = 0; start < 12; start += step) {
      const endMonth = start + step; // ayın bitişinden sonraki ay (0-tabanlı)
      const due = nextBusinessDay(new Date(Date.UTC(year, endMonth + shift, 10)));
      const period = options.vatPeriod === "MONTH" ? `${year}-${String(start + 1).padStart(2, "0")}` : `${year}-Q${start / 3 + 1}`;
      deadlines.push({ key: "ustva", period, due });
    }
  }
  // Yıllık beyanlar (önceki yıl için), danışmansız son tarih 31.07.
  deadlines.push({ key: "annualVat", period: String(year - 1), due: nextBusinessDay(new Date(Date.UTC(year, 6, 31))) });
  deadlines.push({ key: "incomeTax", period: String(year - 1), due: nextBusinessDay(new Date(Date.UTC(year, 6, 31))) });
  return deadlines.sort((a, b) => a.due.getTime() - b.due.getTime());
}

/**
 * § 62 Abs. 1 Nr. 3 AO serbest yedek (freie Rücklage) üst sınırı: Vermögensverwaltung fazlasının
 * 1/3'ü + diğer zamanında kullanılması gereken fonların %10'u.
 */
export function freeReserveLimitCents(input: { assetManagementSurplusCents: number; otherFundsCents: number }): number {
  return Math.max(0, Math.floor(input.assetManagementSurplusCents / 3)) + Math.max(0, Math.floor(input.otherFundsCents / 10));
}
