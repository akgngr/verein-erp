import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { MEMBERS_EXPORT_MAX_ROWS, MEMBER_STATUS_LABELS, MEMBERSHIP_TYPE_LABELS } from "../constants";
import { membersPermissions } from "../permissions";
import {
  MEMBER_DEFAULT_SORT,
  MEMBER_SORTABLE_FIELDS,
  listMembersForExport,
} from "../queries/list-members";
import { berlinToday } from "../utils";

/**
 * Üye defteri Excel dışa aktarımı (GET /api/members/export, Faz 4, 4.6):
 * KARAR: Faz 3'te üye Excel dışa aktarma rotası inşa edilmemişti (listMembersForExport
 * hazır bekliyordu); ülke alanının ekleneceği hedef bu rota olduğu için burada kuruldu.
 * Başlıklar TR kalır (Faz 4 §1: Excel headers stay Turkish). Üye defteri kişisel
 * veri içerir — audit'e içerik YAZILMAZ.
 */
export async function exportMembersHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, membersPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: MEMBER_SORTABLE_FIELDS,
    defaultSort: MEMBER_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status", "type", "from", "to"],
  });

  // Sınır kontrolü: max+1 satır çekilir; fazlaysa kesilir ve not düşülür.
  const fetched = await listMembersForExport(params, MEMBERS_EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > MEMBERS_EXPORT_MAX_ROWS;
  const rows = fetched.slice(0, MEMBERS_EXPORT_MAX_ROWS);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Üye Defteri");

  sheet.columns = [
    { header: "Üye No", key: "membershipNumber", width: 16 },
    { header: "Üyelik Türü", key: "type", width: 16 },
    { header: "Durum", key: "status", width: 12 },
    { header: "Ad", key: "firstName", width: 18 },
    { header: "Soyad", key: "lastName", width: 18 },
    { header: "E-posta", key: "email", width: 26 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "Straße", key: "street", width: 22 },
    { header: "Kapı No", key: "houseNumber", width: 10 },
    { header: "PLZ", key: "postalCode", width: 8 },
    { header: "Şehir", key: "city", width: 16 },
    { header: "Eyalet", key: "state", width: 14 },
    { header: "Ülke", key: "country", width: 14 },
    { header: "Katılım", key: "joinDate", width: 12 },
    { header: "Ayrılış", key: "exitDate", width: 12 },
  ];

  for (const row of rows) {
    const added = sheet.addRow({
      membershipNumber: row.membershipNumber,
      type: MEMBERSHIP_TYPE_LABELS[row.type],
      status: MEMBER_STATUS_LABELS[row.status],
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email ?? "",
      phone: row.phone ?? "",
      street: row.street ?? "",
      houseNumber: row.houseNumber ?? "",
      postalCode: row.postalCode ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      country: row.country ?? "",
      joinDate: row.joinDate,
      exitDate: row.exitDate,
    });
    // Tarihler gerçek tarih hücresi olarak yazılır.
    for (const key of ["joinDate", "exitDate"]) {
      const cell = added.getCell(key);
      if (cell.value instanceof Date) cell.numFmt = "dd.mm.yyyy";
    }
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 15 } };

  if (truncated) {
    const note = sheet.addRow({
      membershipNumber: `Sonuçlar ${MEMBERS_EXPORT_MAX_ROWS.toLocaleString("tr-TR")} satırla sınırlandı.`,
    });
    note.font = { italic: true, bold: true };
    sheet.mergeCells(`A${note.number}:O${note.number}`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `uye-defteri-${berlinToday().toISOString().slice(0, 10)}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "Member",
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
