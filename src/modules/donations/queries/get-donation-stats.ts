import "server-only";

import { getDb } from "@/shared/db";

import { SMALL_DONATION_LIMIT_CENTS } from "../constants";
import type { DonationStats } from "../types";

/** İstatistikler (§ 17): toplam, sayı, bildirimsiz >300 €, düzenlenen/uyarılı bildirim. */
export async function getDonationStats(year: number): Promise<DonationStats> {
  const db = getDb();

  const donations = await db.donation.findMany({
    where: { year, reversedAt: null },
    select: { id: true, amount: true },
  });
  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { itemType: "DONATION", activeKey: { not: null }, sourceId: { in: donations.map((d) => d.id) } },
    select: { sourceId: true },
  });
  const confirmedDonationIds = new Set(activeItems.map((item) => item.sourceId));

  let totalCents = 0;
  let unconfirmedOver300 = 0;
  for (const donation of donations) {
    const cents = Number(donation.amount.mul(100).toFixed(0));
    totalCents += cents;
    if (!confirmedDonationIds.has(donation.id) && cents > SMALL_DONATION_LIMIT_CENTS) {
      unconfirmedOver300 += 1;
    }
  }

  const issuedCount = await db.zuwendungConfirmation.count({
    where: { status: "ISSUED", periodFrom: { gte: new Date(Date.UTC(year, 0, 1)) } },
  });
  const warningCount = await db.zuwendungConfirmation.count({
    where: { status: "ISSUED", items: { some: { itemType: "MEMBER_PAYMENT" } } },
  }).then(async (count) => {
    // Kaba uyarı sayısı: ISSUED aidat bildirimleri içinden void olan ödemeye sahip olanlar.
    void count;
    const rows = await db.zuwendungConfirmation.findMany({
      where: { status: "ISSUED", items: { some: { itemType: "MEMBER_PAYMENT" } } },
      select: { items: { where: { itemType: "MEMBER_PAYMENT" }, select: { sourceId: true } } },
    });
    const paymentIds = [...new Set(rows.flatMap((row) => row.items.map((item) => item.sourceId)))];
    if (paymentIds.length === 0) return 0;
    const voided = await db.memberPayment.findMany({
      where: { id: { in: paymentIds }, voidedAt: { not: null } },
      select: { id: true },
    });
    const voidedIds = new Set(voided.map((payment) => payment.id));
    return rows.filter((row) => row.items.some((item) => voidedIds.has(item.sourceId))).length;
  });

  return {
    totalCents,
    count: donations.length,
    unconfirmedOver300Count: unconfirmedOver300,
    issuedConfirmationCount: issuedCount,
    warningConfirmationCount: warningCount,
  };
}
