import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";

import { accountingPermissions } from "../permissions";
import { buildPain001, isValidIban } from "../services/sepa";
import { berlinToday } from "../utils";

/**
 * GET /api/accounting/payment-run?ids=a,b&date=YYYY-MM-DD — seçili açık gelen faturalar için
 * SEPA pain.001 (ACC-6). Hiçbir şey otomatik ödenmez/fişlenmez: dosya bankaya yüklenir, ödeme
 * banka ekstresi içe aktarılınca eşleştirilir. accounting.create; audit EXPORT.
 */
export async function paymentRunHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, accountingPermissions, "create")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 500);
  const date = url.searchParams.get("date") ?? "";
  const today = berlinToday().toISOString().slice(0, 10);
  if (!ids.length || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.paymentRun.errors.input") }, { status: 400 });
  }
  const db = getDb();
  const [settings, profile, payables] = await Promise.all([
    db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" }, select: { iban: true, bic: true } }),
    getOrganizationProfile(),
    db.accountingPayable.findMany({ where: { id: { in: ids }, status: "OPEN" } }),
  ]);
  if (!settings?.iban || !isValidIban(settings.iban)) return NextResponse.json({ ok: false, error: await translateMessage("accounting.paymentRun.errors.ownIban") }, { status: 422 });
  const payable = payables.filter((item) => item.supplierIban && isValidIban(item.supplierIban) && item.grossCents > item.paidCents);
  if (payable.length !== ids.length) return NextResponse.json({ ok: false, error: await translateMessage("accounting.paymentRun.errors.invalid") }, { status: 422 });

  const now = new Date();
  const messageId = `ZL-${now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
  const xml = buildPain001({
    messageId,
    createdAt: now,
    executionDate: date,
    debtor: { name: profile.name, iban: settings.iban, bic: settings.bic },
    payments: payable.map((item) => ({
      endToEndId: item.number ?? item.id,
      amountCents: item.grossCents - item.paidCents,
      creditorName: item.supplierName,
      creditorIban: item.supplierIban as string,
      creditorBic: null,
      remittance: [item.number ? `Rechnung ${item.number}` : null, item.issueDate ? item.issueDate.toISOString().slice(0, 10) : null].filter(Boolean).join(" "), // i18n-ignore: Verwendungszweck
    })),
  });
  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingPayable",
    entityId: null,
    after: { report: "sepa-pain001", count: payable.length, totalCents: payable.reduce((sum, item) => sum + item.grossCents - item.paidCents, 0), executionDate: date },
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${messageId}.xml"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
