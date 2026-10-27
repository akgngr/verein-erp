import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { BOOKING_TYPE_LABELS } from "../constants";
import { accountingPermissions } from "../permissions";
import { getLedgerReport } from "../queries/get-ledger";
import { berlinToday } from "../utils";

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
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account") ?? "";
  const today = berlinToday();
  const year = today.getUTCFullYear();
  const from = url.searchParams.get("from") ?? `${year}-01-01`;
  const to = url.searchParams.get("to") ?? `${year}-12-31`;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Hesap seçilmedi." }, { status: 400 });
  }

  const report = await getLedgerReport(accountId, from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Kassenbuch");

  sheet.columns = [
    { header: "Tarih", key: "date", width: 12 },
    { header: "Buchungsnr.", key: "number", width: 14 },
    { header: "Açıklama", key: "description", width: 42 },
    { header: "Belge no", key: "receipt", width: 16 },
    { header: "Gelir", key: "income", width: 14 },
    { header: "Gider", key: "expense", width: 14 },
    { header: "Bakiye", key: "balance", width: 14 },
  ];

  const openingRow = sheet.addRow({
    description: `Dönem başı bakiyesi (${report.accountName})`,
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
      description: row.reversedAt ? `${row.description} (İPTAL EDİLDİ)` : row.description,
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
    description: "Dönem sonu bakiyesi",
    balance: report.closingBalanceCents / 100,
  });
  closingRow.font = { bold: true };
  closingRow.getCell("balance").numFmt = '#,##0.00 "€"';

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `kasa-defteri-${report.accountName.replace(/[^\w-]+/g, "-")}-${from}_${to}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: "ledger", account: report.accountName, from, to },
  });

  void BOOKING_TYPE_LABELS;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
