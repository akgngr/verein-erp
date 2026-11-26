import { allocatePayment, type RateGroup } from "./invoice-payments";

/**
 * Gelen fatura/alacak dekontu ödeme planı (saf). Normal faturada açık tutar pozitiftir (ödeme = gider);
 * tedarikçi alacak dekontunda (Gutschrift, CreditNote) tutarlar negatiftir ve tahsilat tedarikçiden gelen
 * iadedir: kullanıcı/banka eşleştirmesi tutarı pozitif girer, plan işareti dekonta göre uygular. Böylece
 * gider fişleri negatif yazılır (gider ve Vorsteuer azalır) ve `paidCents` dekontun işaretiyle ilerler.
 *
 * null: tutar geçersiz (0, açık tutarı aşan veya açık tutar yok).
 */
export function planPayablePayment(
  groups: RateGroup[],
  open: { grossCents: number; paidCents: number },
  requestedCents: number | null,
): { amountCents: number; parts: RateGroup[]; settled: boolean } | null {
  const openCents = open.grossCents - open.paidCents;
  if (openCents === 0) return null;
  const sign = openCents < 0 ? -1 : 1;
  const openAbs = Math.abs(openCents);
  const amountAbs = requestedCents === null ? openAbs : Math.abs(requestedCents);
  if (!Number.isInteger(amountAbs) || amountAbs <= 0 || amountAbs > openAbs) return null;
  const absGroups = groups.map((group) => ({ rate: group.rate, netCents: Math.abs(group.netCents), taxCents: Math.abs(group.taxCents) }));
  const parts = allocatePayment(absGroups, amountAbs)
    .filter((part) => part.netCents + part.taxCents !== 0)
    .map((part) => ({ rate: part.rate, netCents: sign * part.netCents, taxCents: sign * part.taxCents }));
  return { amountCents: sign * amountAbs, parts, settled: amountAbs === openAbs };
}
