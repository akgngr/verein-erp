/**
 * ACC-3 saf yardımcılar: kısmi ödemenin KDV oranlarına dağıtımı, açık tutar, yaşlandırma,
 * cari (Debitor/Kreditor) numarası. DB'siz — test edilebilir.
 */
import { splitGross } from "./tax";

export type RateGroup = { rate: number; netCents: number; taxCents: number };

export function openCents(invoice: { grossCents: number; paidCents: number; skontoCents: number }): number {
  return Math.max(0, invoice.grossCents - invoice.paidCents - invoice.skontoCents);
}

/**
 * Tahsilatı fatura brütündeki oran paylarına göre böler (son grup kalan kuruşu alır), her payı
 * net + KDV'ye ayırır. Böylece kısmi ödeme ve Skonto KDV'yi orantılı düşürür (§ 17 UStG mantığı).
 */
export function allocatePayment(groups: RateGroup[], amountCents: number): RateGroup[] {
  const active = groups.filter((group) => group.netCents + group.taxCents !== 0);
  if (!active.length) return [{ rate: 0, netCents: amountCents, taxCents: 0 }];
  const total = active.reduce((sum, group) => sum + group.netCents + group.taxCents, 0);
  let rest = amountCents;
  return active.map((group, index) => {
    const share = index === active.length - 1 ? rest : Math.round((amountCents * (group.netCents + group.taxCents)) / total);
    rest -= share;
    const { netCents, taxCents } = splitGross(share, group.rate);
    return { rate: group.rate, netCents, taxCents };
  });
}

export type AgingBucket = "notDue" | "d1_30" | "d31_60" | "d61_90" | "d90plus";
export const AGING_BUCKETS: AgingBucket[] = ["notDue", "d1_30", "d31_60", "d61_90", "d90plus"];

/** Vade (yoksa fatura tarihi) ile bugün arasındaki gecikme günü ve kovası. */
export function aging(due: Date, today: Date): { daysOverdue: number; bucket: AgingBucket } {
  const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - due.getTime()) / 86_400_000);
  const bucket: AgingBucket = days <= 0 ? "notDue" : days <= 30 ? "d1_30" : days <= 60 ? "d31_60" : days <= 90 ? "d61_90" : "d90plus";
  return { daysOverdue: Math.max(0, days), bucket };
}

/** DATEV Personenkonten: Debitoren 10000–69999, Kreditoren 70000–99999. */
export const CONTACT_NUMBER_RANGE = { CUSTOMER: [10000, 69999], SUPPLIER: [70000, 99999] } as const;

export function nextContactNumber(type: "CUSTOMER" | "SUPPLIER", lastNumber: number | null): number {
  const [min, max] = CONTACT_NUMBER_RANGE[type];
  const next = lastNumber && lastNumber >= min ? lastNumber + 1 : min;
  if (next > max) throw new Error("accounting.contacts.errors.rangeExhausted");
  return next;
}
