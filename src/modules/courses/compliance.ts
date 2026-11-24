import "server-only";

import { defineComplianceMetrics, pseudonymousRef } from "@/shared/compliance/define";
import { getDb } from "@/shared/db";

import { coursePayoutsAllPermissions } from "./permissions";

/** Compliance metrics (ADR 0009): approved/paid teacher payouts per person and year; pseudonymous ref, no names. */
export const compliance = defineComplianceMetrics({
  module: "courses",
  metrics: [
    {
      key: "courses.teacherPayoutsPerPersonYear",
      permission: { definition: coursePayoutsAllPermissions, action: "view" },
      read: async ({ year }) => {
        const groups = await getDb().courseTeacherPayout.groupBy({
          by: ["teacherId"],
          where: { status: { in: ["APPROVED", "PAID"] }, period: { startsWith: `${year}-` } },
          _sum: { amountCents: true },
        });
        return { kind: "perPerson", unit: "cents", rows: groups.map((group) => ({ ref: pseudonymousRef("L", group.teacherId), value: group._sum.amountCents ?? 0 })) };
      },
    },
  ],
});
