import "server-only";

import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { getLedgerReport } from "../queries/get-ledger";
import { berlinToday } from "../utils";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * Kasa defteri Excel dışa aktarımı (GET /api/accounting/reports/ledger/export,
 * § 11.8 md. 2): dönem başı bakiyesi, kronolojik satırlar (gelir/gider kolonları),
 * yürüyen bakiye, dönem sonu; ekranla aynı hesaplayıcı servis.
 */
export async function exportLedgerHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account") ?? "";
  const today = berlinToday();
  const year = today.getUTCFullYear();
  const from = url.searchParams.get("from") ?? `${year}-01-01`;
  const to = url.searchParams.get("to") ?? `${year}-12-31`;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.export.ledger._noAccount") }, { status: 400 });
  }

  const report = await getLedgerReport(accountId, from, to);

  const tRoot = await getTranslations();
  const tx = (key: string, values?: Record<string, string | number>) => tRoot(`accounting.export.ledger.${key}`, values);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tx("_sheet"));

  sheet.columns = [
    { header: tx("date"), key: "date", width: 12 },
    { header: tx("number"), key: "number", width: 14 },
    { header: tx("description"), key: "description", width: 42 },
    { header: tx("receipt"), key: "receipt", width: 16 },
    { header: tx("income"), key: "income", width: 14 },
    { header: tx("expense"), key: "expense", width: 14 },
    { header: tx("balance"), key: "balance", width: 14 },
  ];

  const openingRow = sheet.addRow({
    description: tx("_opening", { account: report.accountName }),
    balance: report.openingBalanceCents / 100,
  });
  openingRow.font = { bold: true };
  openingRow.getCell("balance").numFmt = '#,##0.00 "€"';

  for (const row of report.rows) {
    const income = row.amountCents > 0 && !row.reversedAt ? row.amountCents / 100 : null;
    const expense = row.amountCents < 0 && !row.reversedAt ? Math.abs(row.amountCents) / 100 : null;
    const added = sheet.addRow({
      date: row.bookingDate,
      number: row.bookingNumber,
      description: row.reversedAt ? `${row.description} (${tRoot("accounting.errors.reversedSuffix")})` : row.description,
      receipt: row.receiptReference ?? "",
      income,
      expense,
      balance: row.runningBalanceCents / 100,
    });
    const dateCell = added.getCell("date");
    if (dateCell.value instanceof Date) dateCell.numFmt = "dd.mm.yyyy";
    for (const key of ["income", "expense", "balance"]) {
      added.getCell(key).numFmt = '#,##0.00 "€"';
    }
    // Negatif yürüyen bakiye kırmızı (§ 11.8 md. 2) — CASH'te kural engeller,
    // BANK için bilgilendirici.
    if (row.runningBalanceCents < 0) {
      added.getCell("balance").font = { color: { argb: "FFB91C1C" }, bold: true };
    }
  }

  const closingRow = sheet.addRow({
    description: tx("_closing"),
    balance: report.closingBalanceCents / 100,
  });
  closingRow.font = { bold: true };
  closingRow.getCell("balance").numFmt = '#,##0.00 "€"';

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${tx("_file")}-${report.accountName.replace(/[^\w-]+/g, "-")}-${from}_${to}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: "ledger", account: report.accountName, from, to },
  });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
