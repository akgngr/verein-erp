import "server-only";

import type { CategoryDirection, Sphere } from "@prisma/client";

import { getDb } from "@/shared/db";

import type { BudgetLineRow } from "../types";

/** Bütçe düzenleme verisi (§ 11.5): aktif kategoriler + plan + gerçekleşen. */
export async function getBudget(year: number): Promise<BudgetLineRow[]> {
  const db = getDb();
  const [categories, budgetLines, bookings] = await Promise.all([
    db.accountingCategory.findMany({
      where: { isActive: true },
      orderBy: [{ direction: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, direction: true, sphere: true },
    }),
    db.accountingBudgetLine.findMany({ where: { year } }),
    db.accountingBooking.findMany({
      where: { year, reversedAt: null, type: { not: "TRANSFER" } },
      select: { categoryId: true, type: true, amount: true },
    }),
  ]);

  const plan = new Map(budgetLines.map((line) => [line.categoryId, Number(line.amount.mul(100).toFixed(0))]));
  const actual = new Map<string, number>();
  for (const booking of bookings) {
    if (!booking.categoryId) continue;
    const cents = Number(booking.amount.mul(100).toFixed(0));
    const key = `${booking.categoryId}:${booking.type}`;
    actual.set(key, (actual.get(key) ?? 0) + cents);
  }

  return categories.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    direction: category.direction as CategoryDirection,
    sphere: category.sphere as Sphere,
    planCents: plan.get(category.id) ?? null,
    actualCents: actual.get(`${category.id}:${category.direction}`) ?? 0,
  }));
}
