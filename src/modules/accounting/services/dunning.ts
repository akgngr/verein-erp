/**
 * ACC-6 ihtar hesapları (saf). Kademeler: 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung.
 * Gecikme faizi § 288 BGB: tüketici (B2C) Basiszinssatz + 5, işletme (B2B) + 9 yüzde puanı;
 * B2B'de ayrıca 40 € götürü (§ 288 Abs. 5) isteğe bağlı. Faiz vade tarihinden ihtar tarihine, gün/365.
 */
export const MAX_DUNNING_LEVEL = 3;

export function nextDunningLevel(input: { dueDate: Date; today: Date; last: { level: number; dunningDate: Date } | null; intervalDays: number }): number | null {
  const day = 86_400_000;
  if (input.today.getTime() <= input.dueDate.getTime()) return null;
  if (!input.last) return 1;
  if (input.last.level >= MAX_DUNNING_LEVEL) return null;
  return input.today.getTime() - input.last.dunningDate.getTime() >= input.intervalDays * day ? input.last.level + 1 : null;
}

export function defaultInterestRate(basePercent: number, business: boolean): number {
  return Math.round((basePercent + (business ? 9 : 5)) * 100) / 100;
}

export function lateInterestCents(openCents: number, ratePercent: number, from: Date, to: Date): number {
  const days = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
  if (ratePercent <= 0 || days === 0) return 0;
  return Math.round((openCents * ratePercent * days) / 100 / 365);
}

export function dunningFeeCents(level: number, fees: { reminder: number; first: number; second: number }): number {
  return level === 1 ? fees.reminder : level === 2 ? fees.first : fees.second;
}
