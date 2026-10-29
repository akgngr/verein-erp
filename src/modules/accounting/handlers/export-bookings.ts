import "server-only";

import ExcelJS from "exceljs";
import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import {
  BOOKINGS_EXPORT_MAX_ROWS,
} from "../constants";
import { accountingPermissions } from "../permissions";
import {
  BOOKING_DEFAULT_SORT,
  BOOKING_SORTABLE_FIELDS,
  listBookingsForExport,
} from "../queries/list-bookings";
import { berlinToday } from "../utils";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * Fiş listesi Excel dışa aktarımı (GET /api/accounting/export, § 11.9):
 * listeyle aynı parametreler (q, filter.*, sort, dir; page yok), max 10.000
 * satır; tarih hücreleri gerçek tarih; tutar sayısal (EUR biçimi). Audit EXPORT.
 */
export async function exportBookingsHandler(request: Request): Promise<Response> {
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

  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: BOOKING_SORTABLE_FIELDS,
    defaultSort: BOOKING_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: [
      "year",
      "type",
      "accountId",
      "categoryId",
      "sphere",
      "projectId",
      "missingReceipt",
      "source",
      "includeReversed",
      "from",
      "to",
    ],
  });

  const fetched = await listBookingsForExport(params, BOOKINGS_EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > BOOKINGS_EXPORT_MAX_ROWS;
  const rows = fetched.slice(0, BOOKINGS_EXPORT_MAX_ROWS);

  const tRoot = await getTranslations();
  const tx = (key: string, values?: Record<string, string | number>) => tRoot(`accounting.export.bookings.${key}`, values);
  const locale = await getLocale();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tx("_sheet"));

  sheet.columns = [
    { header: tx("bookingNumber"), key: "bookingNumber", width: 14 },
    { header: tx("bookingDate"), key: "bookingDate", width: 12 },
    { header: tx("type"), key: "type", width: 18 },
    { header: tx("accountName"), key: "accountName", width: 24 },
    { header: tx("counterAccount"), key: "counterAccount", width: 24 },
    { header: tx("categoryName"), key: "categoryName", width: 30 },
    { header: tx("sphere"), key: "sphere", width: 26 },
    { header: tx("project"), key: "project", width: 18 },
    { header: tx("amount"), key: "amount", width: 14 },
    { header: tx("description"), key: "description", width: 40 },
    { header: tx("counterparty"), key: "counterparty", width: 24 },
    { header: tx("receiptReference"), key: "receiptReference", width: 16 },
    { header: tx("fileCount"), key: "fileCount", width: 12 },
    { header: tx("status"), key: "status", width: 12 },
    { header: tx("reverseReason"), key: "reverseReason", width: 30 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      bookingNumber: row.bookingNumber,
      bookingDate: row.bookingDate,
      type: tRoot(`accounting.enums.bookingType.${row.type}`),
      accountName: row.accountName,
      counterAccount: row.type === "TRANSFER" ? (row.transferLine?.split("→")[1]?.trim() ?? "") : "",
      categoryName: row.categoryName ?? "",
      sphere: row.categorySphere ? tRoot(`accounting.enums.sphere.${row.categorySphere}`) : "",
      project: row.project ?? "",
      amount: row.amountCents / 100,
      description: row.description,
      counterparty: row.counterparty ?? "",
      receiptReference: row.receiptReference ?? "",
      fileCount: row.fileCount,
      status: row.reversedAt ? tx("_reversed") : tx("_active"),
      reverseReason: row.reverseReason ?? "",
    });
    const dateCell = added.getCell("bookingDate");
    if (dateCell.value instanceof Date) dateCell.numFmt = "dd.mm.yyyy";
    added.getCell("amount").numFmt = '#,##0.00 "€"';
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 15 } };

  if (truncated) {
    const note = sheet.addRow({
      bookingNumber: tRoot("common.export.truncated", { max: BOOKINGS_EXPORT_MAX_ROWS.toLocaleString(locale) }),
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:O${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const year = params.filters.year && /^\d{4}$/.test(params.filters.year)
    ? params.filters.year
    : String(berlinToday().getUTCFullYear());
  const fileName = `${tx("_file")}-${year}-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { rows: rows.length, year },
  });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
