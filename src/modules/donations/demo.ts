import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo, demoPerson } from "@/shared/demo/define";

import { formatDonationNumber } from "./services/confirmation-numbers";

const METHODS = ["BANK_TRANSFER", "BANK_TRANSFER", "CASH", "PAYPAL", "CARD"] as const;

/**
 * 30 kurgusal bağışçı ve 30 bağış. Bağışlar GoBD gereği veritabanında silinemez (donations_no_delete):
 * demo kapatıldığında bağışlar ve bağlı bağışçıları test veritabanında kalır (üretim veritabanı
 * yalnızca migration'larla kurulur). Muhasebe kaydı bağlanmaz.
 */
export const demo = defineDemo({
  moduleKey: "donations",
  order: 80,
  async seed(ctx) {
    const db = getDb();
    const last = await db.donor.findFirst({ orderBy: { donorNumber: "desc" }, select: { donorNumber: true } });
    let donorNumber = last?.donorNumber ?? 0;
    const refs = ctx.refs;
    for (let i = 0; i < 30; i++) {
      const p = demoPerson(i + 400);
      const isOrg = i % 6 === 5;
      donorNumber += 1;
      const donor = await db.donor.create({
        data: {
          donorNumber,
          type: isOrg ? "ORGANIZATION" : "PERSON",
          firstName: isOrg ? null : p.firstName,
          lastName: isOrg ? null : p.lastName,
          organizationName: isOrg ? `Beispiel GmbH ${i + 1}` : null,
          street: `${p.street} ${p.houseNumber}`,
          postalCode: p.postalCode,
          city: p.city,
          country: p.country,
          email: p.email,
          phone: p.phone,
          note: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "donor", id: donor.id });
    }
    const donors = refs.filter((r) => r.model === "donor");
    for (let i = 0; i < 30 && donors.length; i++) {
      const receivedAt = daysFromNow(-200 + i * 6);
      const year = receivedAt.getUTCFullYear();
      const last = await db.donation.findFirst({ where: { year, sequence: { gte: 9001 } }, orderBy: { sequence: "desc" }, select: { sequence: true } });
      const sequence = (last?.sequence ?? 9000) + 1;
      const donation = await db.donation.create({
        data: {
          donationNumber: formatDonationNumber(year, sequence),
          year,
          sequence,
          donorId: donors[i % donors.length].id,
          receivedAt,
          amount: [25, 50, 100, 150, 250, 500][i % 6],
          method: METHODS[i % METHODS.length],
          purposeNote: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "donation", id: donation.id });
    }
    return refs;
  },
  // Sonradan gerçek bağış bağlanan bağışçı silinemez (FK); clearRefs onu "silinemedi" olarak döndürür.
  clear: (refs) =>
    clearRefs(refs, {
      // GoBD: veritabanı silmeyi reddeder; bağış ve bağışçısı test veritabanında kalır.
      donation: (ids) => getDb().donation.deleteMany({ where: { id: { in: ids } } }),
      donor: (ids) => getDb().donor.deleteMany({ where: { id: { in: ids } } }),
    }),
});
