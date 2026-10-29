import "server-only";

import ExcelJS from "exceljs";
import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { EXPORT_MAX_ROWS } from "../constants";
import { documentsPermissions } from "../permissions";
import {
  DOCUMENT_DEFAULT_SORT,
  DOCUMENT_SORTABLE_FIELDS,
  listDocumentsForExport,
} from "../queries/list-documents";
import { berlinToday } from "../utils";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * Excel dışa aktarım (GET /api/documents/export, 10. bölüm): liste ekranındaki
 * tüm query parametrelerini aynen kabul eder, page/pageSize yok sayılır.
 * Tek sayfa "Evrak Defteri"; tarihler gerçek tarih hücresi (dd.mm.yyyy).
 */
export async function exportDocumentsHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, documentsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: DOCUMENT_SORTABLE_FIELDS,
    defaultSort: DOCUMENT_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: [
      "direction",
      "status",
      "categoryId",
      "assigneeId",
      "from",
      "to",
      "mine",
      "overdue",
    ],
  });

  // Sınır kontrolü: max+1 satır çekilir; fazlaysa kesilir ve not düşülür.
  const fetched = await listDocumentsForExport(params, user.id, EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > EXPORT_MAX_ROWS;
  const rows = fetched.slice(0, EXPORT_MAX_ROWS);

  const tRoot = await getTranslations();
  const tx = (key: string, values?: Record<string, string | number>) => tRoot(`documents.export.register.${key}`, values);
  const locale = await getLocale();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(tx("_sheet"));

  sheet.columns = [
    { header: tx("registryNumber"), key: "registryNumber", width: 16 },
    { header: tx("direction"), key: "direction", width: 10 },
    { header: tx("registeredAt"), key: "registeredAt", width: 14 },
    { header: tx("documentDate"), key: "documentDate", width: 14 },
    { header: tx("counterparty"), key: "counterparty", width: 30 },
    { header: tx("referenceNumber"), key: "referenceNumber", width: 18 },
    { header: tx("subject"), key: "subject", width: 44 },
    { header: tx("categoryName"), key: "categoryName", width: 16 },
    { header: tx("deliveryMethod"), key: "deliveryMethod", width: 13 },
    { header: tx("status"), key: "status", width: 13 },
    { header: tx("assigneeLabel"), key: "assigneeLabel", width: 22 },
    { header: tx("dueDate"), key: "dueDate", width: 16 },
    { header: tx("fileCount"), key: "fileCount", width: 13 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      registryNumber: row.registryNumber,
      direction: tRoot(`documents.direction.${row.direction}`),
      registeredAt: row.registeredAt,
      documentDate: row.documentDate,
      counterparty: row.counterparty,
      referenceNumber: row.referenceNumber ?? "",
      subject: row.subject,
      categoryName: row.categoryName ?? "",
      deliveryMethod: row.deliveryMethod ? tx(`deliveries.${row.deliveryMethod}`) : "",
      status: tRoot(`documents.status.${row.status}`),
      assigneeLabel: row.assigneeLabel ?? "",
      dueDate: row.dueDate,
      fileCount: row.fileCount,
    });
    // Tarihler gerçek tarih hücresi olarak yazılır (10. bölüm).
    for (const key of ["registeredAt", "documentDate", "dueDate"]) {
      const cell = added.getCell(key);
      if (cell.value instanceof Date) cell.numFmt = "dd.mm.yyyy";
    }
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 13 } };

  if (truncated) {
    const note = sheet.addRow({
      registryNumber: tRoot("common.export.truncated", { max: EXPORT_MAX_ROWS.toLocaleString(locale) }),
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:M${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${tx("_file")}-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
