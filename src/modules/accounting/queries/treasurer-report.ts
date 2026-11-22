import "server-only";

import { getDb } from "@/shared/db";

import {
  computeTreasurerReport,
  type AccountBalanceInput,
  type BookingRowInput,
  type ProjectRowInput,
  type RecordedReserveInput,
  type TreasurerReportResult,
} from "../services/treasurer-report";
import { accountBalanceAt } from "../services/balances";

/**
 * Genel Kurul Kassenbericht verilerini çeker ve hesaplar.
 * Yalnızca toplulaştırılmış veriler döner; şahıs/üye adı içermez.
 */
export async function getTreasurerReportData(year: number): Promise<TreasurerReportResult> {
  const db = getDb();

  const [currentBookings, prevBookings, accounts, projects, recordedReserves] = await Promise.all([
    db.accountingBooking.findMany({
      where: { year, reversedAt: null },
      select: {
        id: true,
        year: true,
        type: true,
        amount: true,
        projectId: true,
        project: { select: { name: true } },
        category: { select: { sphere: true } },
      },
    }),
    db.accountingBooking.findMany({
      where: { year: year - 1, reversedAt: null },
      select: {
        id: true,
        year: true,
        type: true,
        amount: true,
        projectId: true,
        project: { select: { name: true } },
        category: { select: { sphere: true } },
      },
    }),
    db.accountingAccount.findMany({
      where: { isActive: true },
      select: { id: true, name: true, openingDate: true, openingBalance: true },
      orderBy: { name: "asc" },
    }),
    db.accountingProject.findMany({
      select: { id: true, name: true },
    }),
    db.accountingReserve.findMany({
      where: { year },
      select: {
        id: true,
        year: true,
        kind: true,
        amountCents: true,
        purpose: true,
        plannedUseYear: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cents = (val: { toString(): string }) => Math.round(Number(val.toString()) * 100);

  const mapBookings = (list: typeof currentBookings): BookingRowInput[] =>
    list.map((b) => ({
      id: b.id,
      year: b.year,
      type: b.type,
      amountCents: cents(b.amount),
      sphere: b.category?.sphere ?? null,
      projectId: b.projectId,
      projectName: b.project?.name ?? null,
    }));

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const beforeYear = new Date(yearStart.getTime() - 1);
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1) - 1);

  const accountBalances: AccountBalanceInput[] = await Promise.all(
    accounts.map(async (acc) => {
      const opening =
        acc.openingDate > beforeYear
          ? acc.openingDate.getUTCFullYear() === year
            ? Math.round(Number(acc.openingBalance) * 100)
            : 0
          : await accountBalanceAt(acc.id, beforeYear);

      const closing = await accountBalanceAt(acc.id, yearEnd);
      return {
        id: acc.id,
        name: acc.name,
        openingCents: opening,
        closingCents: closing,
      };
    }),
  );

  const projectList: ProjectRowInput[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const mappedReserves: RecordedReserveInput[] = recordedReserves.map((r) => ({
    id: r.id,
    year: r.year,
    kind: r.kind,
    amountCents: r.amountCents,
    purpose: r.purpose,
    plannedUseYear: r.plannedUseYear,
  }));

  return computeTreasurerReport({
    year,
    bookings: mapBookings(currentBookings),
    previousYearBookings: mapBookings(prevBookings),
    accounts: accountBalances,
    projects: projectList,
    recordedReserves: mappedReserves,
  });
}
