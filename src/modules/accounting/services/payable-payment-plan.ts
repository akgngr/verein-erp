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
  // Normalise by the document's overall sign only: groups keep their relative signs (e.g. a negative discount or
  // deposit group inside a positive invoice), so the payment's tax breakdown matches the document. Taking the
  // absolute value per group would turn such a group into an expense and distort the input tax. Inconsistent data
  // whose groups do not add up to the open amount's sign falls back to the absolute values.
  // `|| 0` avoids -0 (sign × 0), which would format as "-0,00 €".
  const signed = (value: number) => sign * value || 0;
  const normalized = groups.map((group) => ({ rate: group.rate, netCents: signed(group.netCents), taxCents: signed(group.taxCents) }));
  const normalizedTotal = normalized.reduce((sum, group) => sum + group.netCents + group.taxCents, 0);
  const basis = normalizedTotal > 0
    ? normalized
    : groups.map((group) => ({ rate: group.rate, netCents: Math.abs(group.netCents), taxCents: Math.abs(group.taxCents) }));
  const allocated = allocatePayment(basis, amountAbs)
    .filter((part) => part.netCents + part.taxCents !== 0)
    .map((part) => ({ rate: part.rate, netCents: signed(part.netCents), taxCents: signed(part.taxCents) }));
  // Each part becomes its own booking and a cash account is checked after every booking: cash-increasing parts
  // (negative amounts) go first, so an offset is never booked after the expense it reduces. Otherwise the original
  // order is kept (same booking order as before for single-sign documents).
  const gross = (part: RateGroup) => part.netCents + part.taxCents;
  const parts = [...allocated.filter((part) => gross(part) < 0), ...allocated.filter((part) => gross(part) >= 0)];
  return { amountCents: sign * amountAbs, parts, settled: amountAbs === openAbs };
}
