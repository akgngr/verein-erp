import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, defineDemo, demoPerson } from "@/shared/demo/define";

/**
 * 30 kurgusal bağışçı. Bağış (Donation) üretilmez: bağışlar GoBD gereği veritabanında silinemez
 * (donations_no_delete), demo kapatıldığında sistem temiz kalmalıdır.
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
    return refs;
  },
  // Sonradan gerçek bağış bağlanan bağışçı silinemez (FK); clearRefs onu "silinemedi" olarak döndürür.
  clear: (refs) => clearRefs(refs, { donor: (ids) => getDb().donor.deleteMany({ where: { id: { in: ids } } }) }),
});
