import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { DIRECTION_LABELS, SPHERE_LABELS, SPHERE_ORDER } from "../constants";
import { accountingPermissions } from "../permissions";
import { getIncomeExpenseReport } from "../queries/get-income-expense-report";
import { berlinToday } from "../utils";

/**
 * Gelir-Gider tablosu Excel dışa aktarımı (GET /api/accounting/reports/
 * income-expense/export?year=, § 11.8 md. 1): alan → kategori gruplu;
 * Plan/Gerçekleşen/Fark/Önceki yıl kolonları; ara toplamlar + genel toplamlar.
 * Ekonomik işletme uyarısı not satırı olarak eklenir.
 */
export async function exportIncomeExpenseHandler(request: Request): Promise<Response> {
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

  const url = new URL(request.url);
  const yearRaw = url.searchParams.get("year") ?? "";
  const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : berlinToday().getUTCFullYear();

  const report = await getIncomeExpenseReport(year);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("EÜR");

  sheet.columns = [
    { header: "Alan", key: "sphere", width: 30 },
    { header: "Yön", key: "direction", width: 10 },
    { header: "Kategori", key: "category", width: 40 },
    { header: "Plan", key: "plan", width: 14 },
    { header: "Gerçekleşen", key: "actual", width: 14 },
    { header: "Fark", key: "diff", width: 14 },
    { header: "Önceki yıl", key: "previous", width: 14 },
  ];

  let currentSphere = "";
  let incomeTotal = 0;
  let expenseTotal = 0;
  for (const sphere of SPHERE_ORDER) {
    for (const row of report.rows.filter((item) => item.sphere === sphere)) {
      if (row.direction === "INCOME") incomeTotal += row.actualCents;
      else expenseTotal += row.actualCents;
      const added = sheet.addRow({
        sphere: row.sphere !== currentSphere ? SPHERE_LABELS[row.sphere] : "",
        direction: DIRECTION_LABELS[row.direction],
        category: row.categoryName,
        plan: row.planCents / 100,
        actual: row.actualCents / 100,
        diff: (row.actualCents - row.planCents) / 100,
        previous: row.previousYearCents / 100,
      });
      for (const key of ["plan", "actual", "diff", "previous"]) {
        added.getCell(key).numFmt = '#,##0.00 "€"';
      }
      currentSphere = row.sphere;
    }
  }

  const totalRow = sheet.addRow({
    category: "GENEL TOPLAM (Gelir - Gider)",
    actual: (incomeTotal - expenseTotal) / 100,
  });
  totalRow.font = { bold: true };
  totalRow.getCell("actual").numFmt = '#,##0.00 "€"';

  if (report.economicOperationNotice !== "none") {
    const noticeText =
      report.economicOperationNotice === "exceeded"
        ? "Ticari işletme gelirleri 50.000 € sınırını aştı (§ 64 Abs. 3 AO). Vergi danışmanına başvurun."
        : "Ticari işletme gelirleri 50.000 € sınırının %80'ine ulaştı (§ 64 Abs. 3 AO).";
    const notice = sheet.addRow({ category: noticeText });
    notice.font = {
      italic: true,
      bold: report.economicOperationNotice === "exceeded",
      color:
        report.economicOperationNotice === "exceeded"
          ? { argb: "FFB91C1C" }
          : { argb: "FF92400E" },
    };
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `gelir-gider-${year}.xlsx`;

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: "income-expense", year },
  });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
