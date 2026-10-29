import "server-only";

import ExcelJS from "exceljs";
import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { DONATIONS_EXPORT_MAX_ROWS } from "../constants";
import { donationsPermissions } from "../permissions";
import {
  DONATION_DEFAULT_SORT,
  DONATION_SORTABLE_FIELDS,
  listDonationsForExport,
} from "../queries/list-donations";
import { translateMessage } from "@/shared/i18n/translate-message";

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
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
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

  const tRoot = await getTranslations();
  const tx = (key: string, values?: Record<string, string | number>) => tRoot(`donations.export.donations.${key}`, values);
  const locale = await getLocale();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tx("_sheet"));

  sheet.columns = [
    { header: tx("donationNumber"), key: "donationNumber", width: 14 },
    { header: tx("receivedAt"), key: "receivedAt", width: 12 },
    { header: tx("donorNumber"), key: "donorNumber", width: 12 },
    { header: tx("donorName"), key: "donorName", width: 30 },
    { header: tx("amount"), key: "amount", width: 14 },
    { header: tx("method"), key: "method", width: 26 },
    { header: tx("waived"), key: "waived", width: 16 },
    { header: tx("confirmationNumber"), key: "confirmationNumber", width: 14 },
    { header: tx("bookingNumber"), key: "bookingNumber", width: 14 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      donationNumber: row.donationNumber,
      receivedAt: row.receivedAt,
      donorNumber: `SP-${String(row.donorNumber).padStart(4, "0")}`,
      donorName: row.donorName,
      amount: row.amountCents / 100,
      method: tx(`methods.${row.method}`),
      waived: row.waivedReimbursement ? tx("_yes") : tx("_no"),
      confirmationNumber: row.confirmationNumber
        ? `${row.confirmationNumber}${row.confirmationCancelled ? ` (${tx("_cancelled")})` : ""}`
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
      donationNumber: tRoot("common.export.truncated", { max: DONATIONS_EXPORT_MAX_ROWS.toLocaleString(locale) }),
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:I${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${tx("_file")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

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
