import "server-only";

import { getDb } from "@/shared/db";

import { listAccountBalances } from "./list-accounts";
import { getBookingTotals } from "./get-booking-totals";
import { getBookingPeriodRange, type AccountingPeriod } from "../services/dashboard-period";
import { bucketOpenDocuments, daysBetween, openCentsOf, topSlices } from "../services/dashboard-outlook";

export const OUTLOOK_DAYS = 30;
const UPCOMING_LIST = 6;
const OPEN_DOCUMENT_LIMIT = 2000;

/**
 * ACC-10 live dashboard data. Uses the shared getBookingTotals definition for every KPI so the dashboard,
 * the list and the reports stay reconciled. Read-only; bounded queries.
 */
export async function getDashboardOverview(args: { year: number; period: AccountingPeriod; part: number; today: Date }) {
  const db = getDb();
  const range = getBookingPeriodRange(args.year, args.period, args.part);
  const previousRange = args.year - 1 >= 1900 ? getBookingPeriodRange(args.year - 1, args.period, args.part) : undefined;
  const horizon = new Date(args.today.getTime() + OUTLOOK_DAYS * 86_400_000);

  const [current, previous, months, balances, expenseGroups, receivables, payables] = await Promise.all([
    getBookingTotals(args.year, range),
    getBookingTotals(args.year - 1, previousRange),
    Promise.all(Array.from({ length: 12 }, (_, index) => getBookingTotals(args.year, getBookingPeriodRange(args.year, "month", index + 1)))),
    listAccountBalances(),
    db.accountingBooking.groupBy({
      by: ["categoryId"],
      where: { year: args.year, reversedAt: null, type: "EXPENSE", ...(range ? { bookingDate: { gte: range.from, lt: range.until } } : {}) },
      _sum: { amount: true },
    }),
    db.accountingInvoice.findMany({
      where: { kind: "INVOICE", status: "ISSUED", dueDate: { lte: horizon } },
      select: { id: true, number: true, recipientName: true, dueDate: true, grossCents: true, paidCents: true, skontoCents: true },
      orderBy: { dueDate: "asc" },
      take: OPEN_DOCUMENT_LIMIT,
    }),
    db.accountingPayable.findMany({
      where: { status: "OPEN", dueDate: { lte: horizon } },
      select: { id: true, number: true, supplierName: true, dueDate: true, grossCents: true, paidCents: true },
      orderBy: { dueDate: "asc" },
      take: OPEN_DOCUMENT_LIMIT,
    }),
  ]);

  const categoryIds = expenseGroups.flatMap((group) => (group.categoryId ? [group.categoryId] : []));
  const categories = categoryIds.length
    ? await db.accountingCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const expenseRows = expenseGroups.map((group) => ({
    id: group.categoryId ?? "none",
    name: group.categoryId ? names.get(group.categoryId) ?? "—" : null,
    cents: Number(group._sum.amount ? group._sum.amount.mul(100).toFixed(0) : 0),
  }));

  const timeline = [
    ...receivables.map((doc) => ({ kind: "receivable" as const, id: doc.id, label: doc.number ?? "—", party: doc.recipientName, dueDate: doc.dueDate!, cents: openCentsOf(doc) })),
    ...payables.map((doc) => ({ kind: "payable" as const, id: doc.id, label: doc.number ?? "—", party: doc.supplierName, dueDate: doc.dueDate!, cents: openCentsOf(doc) })),
  ]
    .filter((item) => item.cents > 0 && item.dueDate && daysBetween(args.today, item.dueDate) >= 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, UPCOMING_LIST);

  return {
    current,
    previous,
    months,
    balances,
    liquidityCents: balances.reduce((sum, balance) => sum + balance.balanceCents, 0),
    expenses: topSlices(expenseRows, 5),
    receivables: bucketOpenDocuments(receivables, args.today, OUTLOOK_DAYS),
    payables: bucketOpenDocuments(payables, args.today, OUTLOOK_DAYS),
    timeline,
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
