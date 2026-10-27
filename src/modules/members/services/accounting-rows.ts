import "server-only";

import type { Prisma, PaymentMethod } from "@prisma/client";

import { getDb } from "@/shared/db";

/**
 * Muhasebe aktarımı için ödeme satırı (Faz 4, 4.6): KİMLİK VERİSİ YOKTUR
 * (ad/e-posta/adres yok — yalnızca üye numarası). Yalnızca accounting modülü
 * kullanır; izin denetimi çağıran modüldedir (sunucudan sunucuya çağrı).
 */
export type AccountingPaymentRow = {
  id: string;
  receiptNumber: string;
  memberNumber: string;
  dueYear: number;
  amountCents: number;
  /** YYYY-MM-DD */
  paidAt: string;
  method: PaymentMethod;
  voidedAt: string | null;
  voidReason: string | null;
};

/**
 * Üyelik aktarımı veri kaynağı: tarih filtreli (opsiyonel), silinmiş üyelerin
 * ödemeleri DAHİLDİR (makbuz geçerliliği üye kaydından bağımsızdır; KARAR:
 * yumuşak silinmiş üyenin ödemesi de muhasebeye aittir — para kaydı).
 */
export async function listPaymentsForAccounting(
  params?: { fromDate?: string; toDate?: string },
): Promise<AccountingPaymentRow[]> {
  const where: Prisma.MemberPaymentWhereInput = {};
  const paidAt: Prisma.DateTimeNullableFilter = {};
  if (params?.fromDate && /^\d{4}-\d{2}-\d{2}$/.test(params.fromDate)) {
    paidAt.gte = new Date(`${params.fromDate}T00:00:00.000Z`);
  }
  if (params?.toDate && /^\d{4}-\d{2}-\d{2}$/.test(params.toDate)) {
    // "to" dahil üst sınır: ertesi gün 00:00'dan küçük.
    const to = new Date(`${params.toDate}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    paidAt.lt = to;
  }
  if (paidAt.gte || paidAt.lt) {
    where.paidAt = paidAt as Prisma.DateTimeFilter;
  }

  const rows = await getDb().memberPayment.findMany({
    where,
    orderBy: [{ paidAt: "asc" }, { sequence: "asc" }],
    select: {
      id: true,
      receiptNumber: true,
      dueYear: true,
      amount: true,
      method: true,
      paidAt: true,
      voidedAt: true,
      voidReason: true,
      member: { select: { membershipNumber: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    memberNumber: row.member.membershipNumber,
    dueYear: row.dueYear,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    paidAt: row.paidAt.toISOString().slice(0, 10),
    method: row.method,
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
    voidReason: row.voidReason,
  }));
}
