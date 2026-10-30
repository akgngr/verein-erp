import type { CourseChargeKind, CourseFeeType } from "@prisma/client";

import { MAX_INSTALLMENTS, MAX_MONTHLY_CHARGES } from "../constants";
import { addMonths, monthKey } from "../utils";

export type PlannedCharge = {
  kind: CourseChargeKind;
  sequence: number;
  total: number;
  period: string | null;
  dueDate: Date;
  amountCents: number;
};

/** İndirimli tutar (yüzde, aşağı yuvarlanmış kuruş değil: en yakın kuruş). */
export function applyDiscount(cents: number, discountPercent: number): number {
  return Math.round((cents * (100 - discountPercent)) / 100);
}

/**
 * Kayıtta oluşan ödeme planı (saf fonksiyon; test edilebilir):
 * - FREE: hiç kalem yok.
 * - ONE_TIME: kayıt tarihinde tek kalem.
 * - INSTALLMENTS: toplam ücret n taksite bölünür (kalan kuruş son taksite), kayıt tarihinden itibaren aylık.
 * - MONTHLY: kursun başladığı (ya da kayıt) ayından bitiş ayına kadar her ay; ay başına ücret.
 */
export function planCharges(input: {
  feeType: CourseFeeType;
  feeCents: number;
  installmentCount: number | null;
  discountPercent: number;
  enrolledAt: Date;
  courseStart: Date;
  courseEnd: Date | null;
}): PlannedCharge[] {
  const { feeType, discountPercent, enrolledAt } = input;
  if (feeType === "FREE" || input.feeCents <= 0 || discountPercent >= 100) return [];

  if (feeType === "ONE_TIME") {
    return [{ kind: "ONE_TIME", sequence: 1, total: 1, period: null, dueDate: enrolledAt, amountCents: applyDiscount(input.feeCents, discountPercent) }];
  }

  if (feeType === "INSTALLMENTS") {
    const count = Math.min(Math.max(input.installmentCount ?? 1, 1), MAX_INSTALLMENTS);
    const totalCents = applyDiscount(input.feeCents, discountPercent);
    const base = Math.floor(totalCents / count);
    return Array.from({ length: count }, (_, index) => ({
      kind: "INSTALLMENT" as const,
      sequence: index + 1,
      total: count,
      period: null,
      dueDate: addMonths(enrolledAt, index),
      amountCents: index === count - 1 ? totalCents - base * (count - 1) : base,
    }));
  }

  // MONTHLY
  const first = enrolledAt > input.courseStart ? enrolledAt : input.courseStart;
  const firstMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const end = input.courseEnd ?? addMonths(firstMonth, 11);
  const months: Date[] = [];
  for (let month = firstMonth; month <= end && months.length < MAX_MONTHLY_CHARGES; month = addMonths(month, 1)) {
    months.push(month);
  }
  const amount = applyDiscount(input.feeCents, discountPercent);
  return months.map((month, index) => ({
    kind: "MONTH" as const,
    sequence: index + 1,
    total: months.length,
    period: monthKey(month),
    // İlk ay kayıt gününde, sonrakiler ayın 1'inde vadeli.
    dueDate: index === 0 ? first : month,
    amountCents: amount,
  }));
}
