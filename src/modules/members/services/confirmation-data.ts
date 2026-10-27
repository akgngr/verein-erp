import "server-only";

import { getDb } from "@/shared/db";

/**
 * Faz 5 (§ 5): bağış bildirimleri (Zuwendungsbestätigung) için VERİ MİNİMİZE
 * sunucudan-sunucuya fonksiyonlar. İZİN DENETİMİ YOKTUR — çağıran modül
 * (donations) kendi izinlerini denetler; bu fonksiyonlar HİÇBİR rotadan
 * sunulmaz (modül içi servis; ESLint sınırı public girişten export edilmez).
 */

/** Bildirim alıcı bloğu: ad + tam adres; eksikse null. */
export type MemberAddressBlock = {
  memberId: string;
  memberNumber: string;
  /** "Ad Soyad" birleşik. */
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string | null;
};

/**
 * Üyenin bildirim alıcı bloğu (§ 5 md. 1): üye silinmiş veya adresi eksikse
 * (street + postalCode + city) null döner.
 */
export async function getMemberAddressBlock(memberId: string): Promise<MemberAddressBlock | null> {
  const member = await getDb().member.findFirst({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      membershipNumber: true,
      firstName: true,
      lastName: true,
      street: true,
      postalCode: true,
      city: true,
      country: true,
    },
  });
  if (!member) return null;
  if (!member.street || !member.postalCode || !member.city) return null;
  return {
    memberId: member.id,
    memberNumber: member.membershipNumber,
    name: `${member.firstName} ${member.lastName}`,
    street: member.street,
    postalCode: member.postalCode,
    city: member.city,
    country: member.country,
  };
}

/** Aidat bildirimi satırı (§ 5 md. 2): yalnız adres + ödeme verisi; başka kişisel alan YOK. */
export type MemberFeePaymentsRow = {
  memberId: string;
  memberNumber: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string | null;
  payments: Array<{
    id: string;
    receiptNumber: string;
    /** YYYY-MM-DD */
    paidAt: string;
    amountCents: number;
  }>;
};

/**
 * Belirtilen yılda, iptal edilmemiş (voidedAt null) ve AKTİF bildirim ögesi
 * olmayan ödemeler, üye bazında gruplanmış. Silinmiş üyeler hariç.
 * (Aktif-öge filtresi donation tarafının activeKey sorgusuyla dışarıdan
 * eklenir — bu fonksiyon yalnız veriyi verir; KARAR: bağımlılık yönü korunur.)
 */
export async function listMemberFeePaymentsForConfirmation(params: {
  year: number;
}): Promise<MemberFeePaymentsRow[]> {
  const db = getDb();

  const payments = await db.memberPayment.findMany({
    where: {
      voidedAt: null,
      paidAt: {
        gte: new Date(Date.UTC(params.year, 0, 1)),
        lt: new Date(Date.UTC(params.year + 1, 0, 1)),
      },
    },
    orderBy: [{ paidAt: "asc" }, { receiptNumber: "asc" }],
    select: {
      id: true,
      receiptNumber: true,
      paidAt: true,
      amount: true,
      member: {
        select: {
          id: true,
          membershipNumber: true,
          firstName: true,
          lastName: true,
          street: true,
          postalCode: true,
          city: true,
          country: true,
          deletedAt: true,
        },
      },
    },
  });

  const byMember = new Map<string, MemberFeePaymentsRow>();
  for (const payment of payments) {
    const member = payment.member;
    if (member.deletedAt) continue;
    // Adres şartı: ad + street + PLZ + city tam olmalı (bildirim adresi).
    if (!member.street || !member.postalCode || !member.city) continue;

    let row = byMember.get(member.id);
    if (!row) {
      row = {
        memberId: member.id,
        memberNumber: member.membershipNumber,
        name: `${member.firstName} ${member.lastName}`,
        street: member.street,
        postalCode: member.postalCode,
        city: member.city,
        country: member.country,
        payments: [],
      };
      byMember.set(member.id, row);
    }
    row.payments.push({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      amountCents: Number(payment.amount.mul(100).toFixed(0)),
    });
  }

  return [...byMember.values()];
}

/** Ödeme durumları (§ 5 md. 3): bildirim uyarısı (void sonrası) için. */
export async function getPaymentStatuses(
  paymentIds: string[],
): Promise<Array<{ id: string; voidedAt: string | null }>> {
  if (paymentIds.length === 0) return [];
  const rows = await getDb().memberPayment.findMany({
    where: { id: { in: paymentIds } },
    select: { id: true, voidedAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
  }));
}
