import "server-only";

import { defineComplianceMetrics } from "@/shared/compliance/define";
import { getDb } from "@/shared/db";

import { accountingPermissions } from "./permissions";

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);

/** Compliance metrics (ADR 0009): yearly sums only; reversed bookings and transfers excluded. */
export const compliance = defineComplianceMetrics({
  module: "accounting",
  metrics: [
    {
      key: "accounting.economicRevenueGross",
      permission: { definition: accountingPermissions, action: "view" },
      read: async ({ year }) => {
        const sum = await getDb().accountingBooking.aggregate({
          where: { year, type: "INCOME", reversedAt: null, category: { sphere: "ECONOMIC_OPERATION" } },
          _sum: { amount: true },
        });
        return { kind: "number", value: cents(sum._sum.amount), unit: "cents" };
      },
    },
    {
      // Rough check (rule wording says "Überschlag"): income − expenses − open reserves of the year (year − lagYears).
      key: "accounting.unusedFundsOfYear",
      permission: { definition: accountingPermissions, action: "view" },
      read: async ({ year, params }) => {
        const lag = typeof params.lagYears === "number" ? params.lagYears : 2;
        const target = year - lag;
        const db = getDb();
        const [income, expense, reserves, bookings] = await Promise.all([
          db.accountingBooking.aggregate({ where: { year: target, type: "INCOME", reversedAt: null }, _sum: { amount: true } }),
          db.accountingBooking.aggregate({ where: { year: target, type: "EXPENSE", reversedAt: null }, _sum: { amount: true } }),
          db.accountingReserve.aggregate({ where: { year: target, releasedYear: null }, _sum: { amountCents: true } }),
          db.accountingBooking.count({ where: { year: target } }),
        ]);
        if (bookings === 0) return { kind: "missing", reason: "noBookings" };
        return { kind: "number", value: cents(income._sum.amount) - cents(expense._sum.amount) - (reserves._sum.amountCents ?? 0), unit: "cents" };
      },
    },
  ],
});
