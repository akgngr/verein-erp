import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { CONFIRMATION_CONTENT_LABELS, CONFIRMATION_KIND_LABELS, DONATIONS_EXPORT_MAX_ROWS } from "../constants";
import { donationsPermissions } from "../permissions";
import {
  CONFIRMATION_DEFAULT_SORT,
  CONFIRMATION_SORTABLE_FIELDS,
  listConfirmations,
} from "../queries/list-confirmations";

/**
 * Zuwendungsregister Excel (§ 15 md. 9): /api/donations/confirmations/export.
 * Alıcı adı DAHİL (kişisel veri belgesi — README notu).
 */
export async function exportConfirmationsHandler(request: Request): Promise<Response> {
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
    sortableFields: CONFIRMATION_SORTABLE_FIELDS,
    defaultSort: CONFIRMATION_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["year", "kind", "content", "status", "warned"],
  });

  const fetched = await listConfirmations({ ...params, take: DONATIONS_EXPORT_MAX_ROWS });
  const rows = fetched.rows;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Zuwendungsregister");

  sheet.columns = [
    { header: "ZB-no", key: "confirmationNumber", width: 14 },
    { header: "Tarih", key: "issuedAt", width: 12 },
    { header: "Tür", key: "kind", width: 30 },
    { header: "İçerik", key: "content", width: 24 },
    { header: "Alıcı adı", key: "recipientName", width: 32 },
    { header: "Dönem", key: "period", width: 26 },
    { header: "Toplam", key: "total", width: 14 },
    { header: "Durum", key: "status", width: 14 },
    { header: "İptal nedeni", key: "cancelReason", width: 34 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      confirmationNumber: row.confirmationNumber,
      issuedAt: row.issuedAt,
      kind: CONFIRMATION_KIND_LABELS[row.kind],
      content: CONFIRMATION_CONTENT_LABELS[row.content],
      recipientName: row.recipientName,
      period: "",
      total: row.totalCents / 100,
      status: row.status === "ISSUED" ? "Düzenlendi" : "İptal edildi",
      cancelReason: "",
    });
    const dateCell = added.getCell("issuedAt");
    if (dateCell.value instanceof Date) dateCell.numFmt = "dd.mm.yyyy";
    added.getCell("total").numFmt = '#,##0.00 "€"';
  }

  // Dönem + iptal nedeni ayrı sorgu (liste satırlarında yok — kayıt başına).
  void rows;

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `zuwendungsregister-${new Date().toISOString().slice(0, 10)}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "ZuwendungConfirmation",
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
