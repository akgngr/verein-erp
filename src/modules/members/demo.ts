import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo, demoPerson } from "@/shared/demo/define";

import { formatMembershipNumber } from "./services/membership-number";

/** 30 kurgusal üye. Numara sırası 9001'den başlar; gerçek sayaç (MemberCounter) değişmez. */
export const demo = defineDemo({
  moduleKey: "members",
  order: 10,
  async seed(ctx) {
    const db = getDb();
    const year = new Date().getUTCFullYear();
    const types = ["ASIL", "ASIL", "ASIL", "DESTEKCI", "FAHRI"] as const;
    const refs = ctx.refs;
    for (let i = 0; i < 30; i++) {
      const p = demoPerson(i);
      const sequence = 9001 + i;
      const member = await db.member.create({
        data: {
          year,
          sequence,
          membershipNumber: formatMembershipNumber(year, sequence),
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          street: p.street,
          houseNumber: p.houseNumber,
          postalCode: p.postalCode,
          city: p.city,
          country: p.country,
          birthDate: p.birthDate,
          type: types[i % types.length],
          status: i % 10 === 9 ? "PASSIVE" : "ACTIVE",
          joinDate: daysFromNow(-30 * (i + 1)),
          notes: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "member", id: member.id });
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      member: async (ids) => {
        const db = getDb();
        await db.memberNote.deleteMany({ where: { memberId: { in: ids } } });
        await db.member.deleteMany({ where: { id: { in: ids } } });
      },
    }),
});
