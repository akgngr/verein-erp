import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { listAccountLabels, listTaxRows } from "../queries/tax-reports";
import { getTaxSettings } from "../services/tax";
import { buildDatevAccountLabelsCsv, buildDatevBookingsCsv, datevIssues } from "../services/tax-reports";
import { parseDateOnly } from "../utils";

/**
 * GET /api/accounting/datev?kind=bookings|accounts&from=YYYY-MM-DD&to=YYYY-MM-DD
 * DATEV EXTF (Buchungsstapel / Kontenbeschriftungen). accounting.view; audit EXPORT.
 * Berater-/Mandantennummer yoksa veya fişlerde hesap numarası eksikse 422 döner.
 */
export async function exportDatevHandler(request: Request): Promise<Response> {
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

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "accounts" ? "accounts" : "bookings";
  const from = parseDateOnly(url.searchParams.get("from") ?? "");
  const to = parseDateOnly(url.searchParams.get("to") ?? "");
  // DATEV Buchungsstapel tek mali yıl içinde olmalı.
  if (!from || !to || from > to || from.getUTCFullYear() !== to.getUTCFullYear()) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.tax.datev.errors.period") }, { status: 400 });
  }

  const settings = await getTaxSettings(getDb());
  if (!settings.datevConsultantNo || !settings.datevClientNo) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.tax.datev.errors.numbers") }, { status: 422 });
  }
  const base = {
    consultantNo: settings.datevConsultantNo,
    clientNo: settings.datevClientNo,
    fiscalYearStart: new Date(Date.UTC(from.getUTCFullYear(), 0, 1)),
    from,
    to,
    accountLength: 4,
  };

  let body: Uint8Array;
  let fileName: string;
  let count: number;
  if (kind === "accounts") {
    const labels = await listAccountLabels();
    body = buildDatevAccountLabelsCsv(labels, base);
    fileName = `EXTF_Kontenbeschriftungen_${from.getUTCFullYear()}.csv`;
    count = labels.length;
  } else {
    const rows = await listTaxRows(from, to);
    if (datevIssues(rows).length) {
      return NextResponse.json({ ok: false, error: await translateMessage("accounting.tax.datev.errors.missingNumbers") }, { status: 422 });
    }
    body = buildDatevBookingsCsv(rows, { ...base, useTaxKeys: settings.datevTaxKeys, label: `Buchungen ${url.searchParams.get("from")}` });
    fileName = `EXTF_Buchungsstapel_${url.searchParams.get("from")}_${url.searchParams.get("to")}.csv`;
    count = rows.length;
  }

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: `datev-${kind}`, from: url.searchParams.get("from"), to: url.searchParams.get("to"), count },
  });

  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
