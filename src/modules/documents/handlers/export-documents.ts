import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { DELIVERY_METHOD_LABELS, DIRECTION_LABELS, EXPORT_MAX_ROWS, STATUS_LABELS } from "../constants";
import { documentsPermissions } from "../permissions";
import {
  DOCUMENT_DEFAULT_SORT,
  DOCUMENT_SORTABLE_FIELDS,
  listDocumentsForExport,
} from "../queries/list-documents";
import { berlinToday } from "../utils";

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
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, documentsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Evrak Defteri");

  sheet.columns = [
    { header: "Kayıt No", key: "registryNumber", width: 16 },
    { header: "Yön", key: "direction", width: 10 },
    { header: "Kayıt Tarihi", key: "registeredAt", width: 14 },
    { header: "Evrak Tarihi", key: "documentDate", width: 14 },
    { header: "Gönderen/Alıcı", key: "counterparty", width: 30 },
    { header: "Evrak Sayısı", key: "referenceNumber", width: 18 },
    { header: "Konu", key: "subject", width: 44 },
    { header: "Kategori", key: "categoryName", width: 16 },
    { header: "Teslim Şekli", key: "deliveryMethod", width: 13 },
    { header: "Durum", key: "status", width: 13 },
    { header: "Sorumlu", key: "assigneeLabel", width: 22 },
    { header: "Son İşlem Tarihi", key: "dueDate", width: 16 },
    { header: "Dosya Sayısı", key: "fileCount", width: 13 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      registryNumber: row.registryNumber,
      direction: DIRECTION_LABELS[row.direction],
      registeredAt: row.registeredAt,
      documentDate: row.documentDate,
      counterparty: row.counterparty,
      referenceNumber: row.referenceNumber ?? "",
      subject: row.subject,
      categoryName: row.categoryName ?? "",
      deliveryMethod: row.deliveryMethod ? DELIVERY_METHOD_LABELS[row.deliveryMethod] : "",
      status: STATUS_LABELS[row.status],
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
      registryNumber: `Sonuçlar ${EXPORT_MAX_ROWS.toLocaleString("tr-TR")} satırla sınırlandı.`,
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:M${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `evrak-defteri-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
