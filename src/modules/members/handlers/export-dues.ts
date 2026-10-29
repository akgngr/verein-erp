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
  DUES_EXPORT_MAX_ROWS,
} from "../constants";
import { memberPaymentsPermissions } from "../permissions";
import {
  DUES_DEFAULT_SORT,
  DUES_SORTABLE_FIELDS,
  listDuesForExport,
} from "../queries/list-dues";
import { berlinToday, berlinYear } from "../utils";
import { translateMessage } from "@/shared/i18n/translate-message";

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
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, memberPaymentsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
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

  const tRoot = await getTranslations();
  const tx = (key: string, values?: Record<string, string | number>) => tRoot(`members.export.dues.${key}`, values);
  const locale = await getLocale();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tx("_sheet"));

  sheet.columns = [
    { header: tx("membershipNumber"), key: "membershipNumber", width: 16 },
    { header: tx("fullName"), key: "fullName", width: 26 },
    { header: tx("type"), key: "type", width: 16 },
    { header: tx("year"), key: "year", width: 8 },
    { header: tx("amountDue"), key: "amountDue", width: 14 },
    { header: tx("paid"), key: "paid", width: 14 },
    { header: tx("remaining"), key: "remaining", width: 14 },
    { header: tx("status"), key: "status", width: 12 },
    { header: tx("lastPaymentAt"), key: "lastPaymentAt", width: 18 },
    { header: tx("dueDate"), key: "dueDate", width: 14 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      membershipNumber: row.membershipNumber,
      fullName: row.fullName,
      type: tRoot(`members.type.${row.type}`),
      year: row.year,
      amountDue: row.amountDueCents / 100,
      paid: row.paidCents / 100,
      remaining: row.remainingCents / 100,
      status: tRoot(`members.dues.status.${row.status}`),
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
      membershipNumber: tRoot("common.export.truncated", { max: DUES_EXPORT_MAX_ROWS.toLocaleString(locale) }),
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:J${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${tx("_file")}-${year}-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

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
