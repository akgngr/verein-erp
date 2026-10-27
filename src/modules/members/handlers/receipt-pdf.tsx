import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { memberPaymentsPermissions } from "../permissions";
import { RECEIPT_STRINGS } from "../pdf/strings";
import { ReceiptDocument, type ReceiptPdfData } from "../pdf/receipt-document";

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Aidat makbuzu PDF (GET /api/members/[id]/receipt-pdf?payment=..., 4.3/4.6):
 * makbuz PDF'i payment kimliğiyle alınır; izin memberPayments.view (makbuz üye
 * verisi taşır — AUDITOR/VIEWER makbuzu göremez; KARAR: payments izniyle sınırlı).
 * Inline disposition, Cache-Control: no-store; ?lang=de|tr (varsayılan env).
 */
export async function exportReceiptPdfHandler(
  request: Request,
  ctx: { id: string },
): Promise<Response> {
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

  const paymentId = new URL(request.url).searchParams.get("payment") ?? "";
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "Ödeme belirtilmedi." }, { status: 400 });
  }

  const db = getDb();
  const payment = await db.memberPayment.findFirst({
    where: { id: paymentId, memberId: ctx.id },
    include: {
      member: { select: { firstName: true, lastName: true, membershipNumber: true } },
    },
  });
  if (!payment) {
    return NextResponse.json({ ok: false, error: "Ödeme bulunamadı." }, { status: 404 });
  }

  const lang = resolvePdfLang(request);
  const strings = RECEIPT_STRINGS[lang];

  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const data: ReceiptPdfData = {
    organization: {
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      registerCourt: profile.registerCourt,
      registerNumber: profile.registerNumber,
      taxNumber: profile.taxNumber,
      taxOffice: profile.taxOffice,
      exemptionNoticeDate: profile.exemptionNoticeDate,
      exemptionNoticePeriod: profile.exemptionNoticePeriod,
      logoDataUri,
    },
    lang,
    strings,
    receiptNumber: payment.receiptNumber,
    memberName: `${payment.member.firstName} ${payment.member.lastName}`,
    memberNumber: payment.member.membershipNumber,
    dueYear: payment.dueYear,
    amountLabel: formatPdfMoney(Number(payment.amount.mul(100).toFixed(0)), lang),
    paidAtLabel: formatPdfDate(payment.paidAt, lang),
    methodLabel: strings.methodLabels[payment.method],
    reference: payment.reference,
    voidedAtLabel: payment.voidedAt ? formatPdfDate(payment.voidedAt, lang) : null,
    voidReason: payment.voidReason,
  };

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<ReceiptDocument data={data} />);

  const fileName = `makbuz-${payment.receiptNumber}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
