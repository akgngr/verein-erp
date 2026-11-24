import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";

import { getDonationConfirmationPdfForPortal } from "@/modules/donations/server";
import { renderMemberPaymentReceiptPdfForPortal } from "@/modules/members/server";

import { getActivePortalSession } from "../../../services/auth";
import {
  isPortalEnabled,
  isPortalStepUpActive,
  PORTAL_SESSION_COOKIE,
} from "../../../services/auth-core";
import { verifyReceiptRef } from "../../../services/receipt-ref";

function parseSubjectRef(ref: string): { kind: "member" | "guardian"; id: string } | null {
  const idx = ref.indexOf(":");
  if (idx <= 0) return null;
  const kind = ref.slice(0, idx);
  const id = ref.slice(idx + 1);
  if ((kind !== "member" && kind !== "guardian") || !id) return null;
  return { kind, id };
}

export async function handlePortalReceiptDownloadGet(
  request: Request,
  ctx: { ref: string },
): Promise<Response> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getActivePortalSession(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isPortalStepUpActive(session)) {
    return NextResponse.json({ ok: false, error: "stepUpRequired" }, { status: 403 });
  }

  const verified = verifyReceiptRef(ctx.ref, session.subjectRef);
  if (!verified) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsedSubject = parseSubjectRef(session.subjectRef);
  if (!parsedSubject || parsedSubject.kind !== "member") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (verified.kind === "dues") {
    const langParam = new URL(request.url).searchParams.get("lang");
    const lang = langParam === "tr" ? "tr" : "de";
    const pdf = await renderMemberPaymentReceiptPdfForPortal({
      memberId: parsedSubject.id,
      paymentId: verified.id,
      lang,
    });
    if (!pdf) {
      return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
    }

    await writeAudit({
      userId: session.subjectRef,
      userLabel: "Member Portal",
      action: "PORTAL_RECEIPT_DOWNLOAD",
      entity: "MemberPayment",
      entityId: verified.id,
      after: { receiptNumber: pdf.receiptNumber },
    });

    return new Response(new Uint8Array(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="makbuz-${pdf.receiptNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const donationPdf = await getDonationConfirmationPdfForPortal({
    memberId: parsedSubject.id,
    confirmationId: verified.id,
  });
  if (!donationPdf) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  await writeAudit({
    userId: session.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_RECEIPT_DOWNLOAD",
    entity: "ZuwendungConfirmation",
    entityId: verified.id,
    after: { confirmationNumber: donationPdf.confirmationNumber },
  });

  return new Response(new Uint8Array(donationPdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${donationPdf.confirmationNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
