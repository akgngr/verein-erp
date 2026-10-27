import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import {
  DUES_EXPORT_MAX_ROWS,
  MEMBER_DUE_STATUS_LABELS,
  MEMBERSHIP_TYPE_LABELS,
} from "../constants";
import { memberPaymentsPermissions } from "../permissions";
import {
  DUES_DEFAULT_SORT,
  DUES_SORTABLE_FIELDS,
  listDuesForExport,
} from "../queries/list-dues";
import { berlinToday, berlinYear } from "../utils";

/**
 * Aidat raporu Excel dışa aktarımı (GET /api/members/dues/export, Faz 3 eklemeleri).
 * Para hücreleri sayısaldır (format: #,##0.00 "€"); tarihler gerçek tarih hücresi.
 * Kişisel veri içerir — audit'e yalnızca satır sayısı ve yıl yazılır.
 */
export async function exportDuesHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, memberPaymentsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: DUES_SORTABLE_FIELDS,
    defaultSort: DUES_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status", "type", "year"],
  });

  const yearRaw = Number(params.filters.year);
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= berlinYear(new Date()) + 1
      ? yearRaw
      : berlinYear(new Date());

  const fetched = await listDuesForExport(params, year, DUES_EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > DUES_EXPORT_MAX_ROWS;
  const rows = fetched.slice(0, DUES_EXPORT_MAX_ROWS);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Aidat");

  sheet.columns = [
    { header: "Üye No", key: "membershipNumber", width: 16 },
    { header: "Ad Soyad", key: "fullName", width: 26 },
    { header: "Üyelik Türü", key: "type", width: 16 },
    { header: "Yıl", key: "year", width: 8 },
    { header: "Tutar", key: "amountDue", width: 14 },
    { header: "Ödenen", key: "paid", width: 14 },
    { header: "Kalan", key: "remaining", width: 14 },
    { header: "Durum", key: "status", width: 12 },
    { header: "Son Ödeme Tarihi", key: "lastPaymentAt", width: 18 },
    { header: "Son Tarih", key: "dueDate", width: 14 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      membershipNumber: row.membershipNumber,
      fullName: row.fullName,
      type: MEMBERSHIP_TYPE_LABELS[row.type],
      year: row.year,
      amountDue: row.amountDueCents / 100,
      paid: row.paidCents / 100,
      remaining: row.remainingCents / 100,
      status: MEMBER_DUE_STATUS_LABELS[row.status],
      lastPaymentAt: row.lastPaymentAt ? new Date(`${row.lastPaymentAt}T00:00:00.000Z`) : "",
      dueDate: new Date(`${row.dueDate}T00:00:00.000Z`),
    });
    for (const key of ["amountDue", "paid", "remaining"]) {
      added.getCell(key).numFmt = '#,##0.00 "€"';
    }
    for (const key of ["lastPaymentAt", "dueDate"]) {
      const cell = added.getCell(key);
      if (cell.value instanceof Date) cell.numFmt = "dd.mm.yyyy";
    }
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };

  if (truncated) {
    const note = sheet.addRow({
      membershipNumber: `Sonuçlar ${DUES_EXPORT_MAX_ROWS.toLocaleString("tr-TR")} satırla sınırlandı.`,
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:J${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `aidat-${year}-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "MemberDue",
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
