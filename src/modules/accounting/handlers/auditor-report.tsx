import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { AuditorReportDocument } from "../pdf/auditor-report-document";
import { DOCUMENT_STRINGS } from "../pdf/document-strings";
import { getGobdStatus } from "../queries/gobd";
import { accountBalanceAt } from "../services/balances";
import { authorizePdf, loadLetterhead, pdfResponse } from "./pdf-support";

/** GET /api/accounting/extras/auditor-report?year= — Kassenprüfungsbericht (ACC-8). */
export async function auditorReportHandler(request: Request): Promise<Response> {
  const user = await authorizePdf();
  if (user instanceof Response) return user;
  const yearRaw = new URL(request.url).searchParams.get("year") ?? "";
  if (!/^\d{4}$/.test(yearRaw)) return NextResponse.json({ ok: false, error: await translateMessage("accounting.gobd.errors.year") }, { status: 400 });
  const year = Number(yearRaw);
  const lang = resolvePdfLang(request);
  const s = DOCUMENT_STRINGS[lang].auditor;
  const db = getDb();
  const end = new Date(Date.UTC(year, 11, 31));
  const startPrev = new Date(Date.UTC(year - 1, 11, 31));
  const [letterhead, accounts, bookings, status] = await Promise.all([
    loadLetterhead(),
    db.accountingAccount.findMany({ orderBy: { name: "asc" } }),
    db.accountingBooking.findMany({ where: { year, reversedAt: null }, select: { type: true, amount: true, accountId: true, counterAccountId: true } }),
    getGobdStatus(end),
  ]);
  const cents = (value: { toString(): string }) => Math.round(Number(value.toString()) * 100);
  const rows = await Promise.all(
    accounts.map(async (account) => {
      const income = bookings.filter((row) => row.type === "INCOME" && row.accountId === account.id).reduce((sum, row) => sum + cents(row.amount), 0);
      const expense = bookings.filter((row) => row.type === "EXPENSE" && row.accountId === account.id).reduce((sum, row) => sum + cents(row.amount), 0);
      const transfer = bookings.filter((row) => row.type === "TRANSFER").reduce((sum, row) => sum + (row.counterAccountId === account.id ? cents(row.amount) : 0) - (row.accountId === account.id ? cents(row.amount) : 0), 0);
      const opening = account.openingDate > startPrev ? (account.openingDate.getUTCFullYear() === year ? Math.round(Number(account.openingBalance) * 100) : 0) : await accountBalanceAt(account.id, startPrev);
      return { name: account.name, openingCents: opening, incomeCents: income, expenseCents: expense, transferCents: transfer, closingCents: await accountBalanceAt(account.id, end) };
    }),
  );
  const yearReceipts = status.checks.missingReceipts.filter((row) => row.bookingDate.getUTCFullYear() === year).length;
  const gaps = status.checks.sequenceGaps.find((gap) => gap.year === year);
  const checks = [
    { label: s.checkJournal, ok: status.journal.problems.length === 0, detail: status.journal.problems.length ? s.issues(status.journal.problems.length) : s.ok },
    { label: s.checkReceipts, ok: yearReceipts === 0, detail: yearReceipts ? s.missing(yearReceipts) : s.ok },
    { label: s.checkGaps, ok: !gaps, detail: gaps ? gaps.missing.join(", ") : s.ok },
    { label: s.checkCash, ok: status.cash.every((cash) => cash.unclosedDays === 0), detail: status.cash.map((cash) => `${cash.name}: ${cash.unclosedDays}`).join(", ") || s.ok },
  ];
  return pdfResponse({
    user,
    document: (
      <AuditorReportDocument
        data={{
          organization: letterhead,
          lang,
          year,
          accounts: rows,
          checks,
          strings: { ...s, intro: s.intro(year) },
        }}
      />
    ),
    fileName: `kassenpruefung-${year}.pdf`,
    audit: { entity: "AccountingBooking", entityId: null, after: { report: "auditor-report", year } },
  });
}
