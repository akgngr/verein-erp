import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { DONATION_METHOD_LABELS, DONATIONS_EXPORT_MAX_ROWS } from "../constants";
import { donationsPermissions } from "../permissions";
import {
  DONATION_DEFAULT_SORT,
  DONATION_SORTABLE_FIELDS,
  listDonationsForExport,
} from "../queries/list-donations";

/**
 * Bağış listesi Excel (§ 15 md. 9): /api/donations/export. KARAR: bağışçı
 * adları DAHİL — bu dosya kişisel veri belgesidir (README'de belirtilir).
 */
export async function exportDonationsHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: DONATION_SORTABLE_FIELDS,
    defaultSort: DONATION_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["year", "method", "waived", "confirmation", "over300", "from", "to"],
  });

  const fetched = await listDonationsForExport(params, DONATIONS_EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > DONATIONS_EXPORT_MAX_ROWS;
  const rows = fetched.slice(0, DONATIONS_EXPORT_MAX_ROWS);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Spenden");

  sheet.columns = [
    { header: "No", key: "donationNumber", width: 14 },
    { header: "Tarih", key: "receivedAt", width: 12 },
    { header: "Bağışçı No", key: "donorNumber", width: 12 },
    { header: "Bağışçı adı", key: "donorName", width: 30 },
    { header: "Tutar", key: "amount", width: 14 },
    { header: "Yöntem", key: "method", width: 26 },
    { header: "Aufwandsspende", key: "waived", width: 16 },
    { header: "Bildirim No", key: "confirmationNumber", width: 14 },
    { header: "Muhasebe fişi", key: "bookingNumber", width: 14 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      donationNumber: row.donationNumber,
      receivedAt: row.receivedAt,
      donorNumber: `SP-${String(row.donorNumber).padStart(4, "0")}`,
      donorName: row.donorName,
      amount: row.amountCents / 100,
      method: DONATION_METHOD_LABELS[row.method],
      waived: row.waivedReimbursement ? "Evet (Ja)" : "Hayır (Nein)",
      confirmationNumber: row.confirmationNumber
        ? `${row.confirmationNumber}${row.confirmationCancelled ? " (İPTAL)" : ""}`
        : "Yok",
      bookingNumber: row.bookingNumber ?? "",
    });
    const dateCell = added.getCell("receivedAt");
    if (dateCell.value instanceof Date) dateCell.numFmt = "dd.mm.yyyy";
    added.getCell("amount").numFmt = '#,##0.00 "€"';
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };

  if (truncated) {
    const note = sheet.addRow({
      donationNumber: `Sonuçlar ${DONATIONS_EXPORT_MAX_ROWS.toLocaleString("tr-TR")} satırla sınırlandı.`,
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:I${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `bagislar-${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Audit: kişisel veri içeriği YAZILMAZ (§ 11 md. 13).
  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "Donation",
    entityId: null,
    after: { rows: rows.length },
  });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
