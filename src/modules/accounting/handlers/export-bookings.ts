import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import {
  BOOKING_TYPE_LABELS,
  BOOKINGS_EXPORT_MAX_ROWS,
  SOURCE_TYPE_LABELS,
  SPHERE_LABELS,
} from "../constants";
import { accountingPermissions } from "../permissions";
import {
  BOOKING_DEFAULT_SORT,
  BOOKING_SORTABLE_FIELDS,
  listBookingsForExport,
} from "../queries/list-bookings";
import { berlinToday } from "../utils";

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
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Buchungen");

  sheet.columns = [
    { header: "Buchungsnr.", key: "bookingNumber", width: 14 },
    { header: "Tarih", key: "bookingDate", width: 12 },
    { header: "Tür", key: "type", width: 18 },
    { header: "Hesap", key: "accountName", width: 24 },
    { header: "Hedef hesap", key: "counterAccount", width: 24 },
    { header: "Kategori", key: "categoryName", width: 30 },
    { header: "Alan", key: "sphere", width: 26 },
    { header: "Proje", key: "project", width: 18 },
    { header: "Tutar", key: "amount", width: 14 },
    { header: "Açıklama", key: "description", width: 40 },
    { header: "Karşı taraf", key: "counterparty", width: 24 },
    { header: "Belge no", key: "receiptReference", width: 16 },
    { header: "Belge sayısı", key: "fileCount", width: 12 },
    { header: "Durum", key: "status", width: 12 },
    { header: "İptal nedeni", key: "reverseReason", width: 30 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      bookingNumber: row.bookingNumber,
      bookingDate: row.bookingDate,
      type: BOOKING_TYPE_LABELS[row.type],
      accountName: row.accountName,
      counterAccount: row.type === "TRANSFER" ? (row.transferLine?.split("→")[1]?.trim() ?? "") : "",
      categoryName: row.categoryName ?? "",
      sphere: row.categorySphere ? SPHERE_LABELS[row.categorySphere] : "",
      project: row.project ?? "",
      amount: row.amountCents / 100,
      description: row.description,
      counterparty: row.counterparty ?? "",
      receiptReference: row.receiptReference ?? "",
      fileCount: row.fileCount,
      status: row.reversedAt ? "İptal edildi" : "Aktif",
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
      bookingNumber: `Sonuçlar ${BOOKINGS_EXPORT_MAX_ROWS.toLocaleString("tr-TR")} satırla sınırlandı.`,
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:O${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const year = params.filters.year && /^\d{4}$/.test(params.filters.year)
    ? params.filters.year
    : String(berlinToday().getUTCFullYear());
  const fileName = `buchungen-${year}-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

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

// (REFERENCE) SOURCE_TYPE_LABELS — Excel "Kaynak" kolonu spec § 11.9'da yok; UI'da var.
void SOURCE_TYPE_LABELS;
