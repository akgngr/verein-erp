import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { getSepaCreditorSettings } from "@/modules/accounting/server";
import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { SMALL_DONATION_LIMIT_CENTS } from "../constants";
import {
  SimplifiedProofDocument,
  type SimplifiedProofPdfData,
} from "../pdf/simplified-proof-document";
import type { ExemptionDocumentTypeKey } from "../pdf/template-de";
import { donationsPermissions } from "../permissions";

/**
 * GET /api/donations/simplified-proof/pdf[?donationId=...] (#618)
 *
 * § 50 Abs. 4 Satz 1 Nr. 2 EStDV vereinfachter Spendennachweis (<= 300 EUR).
 * - Without `donationId`: downloads the organization's generic notice (with optional open-amount EPC-QR).
 * - With `donationId`: validates the donation is active, monetary (not IN_KIND), and <= 300 EUR,
 *   then includes donation summary + pre-filled EPC-QR (when IBAN is configured).
 */
export async function simplifiedProofPdfHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("common.errors.sessionExpired") },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("common.errors.forbidden") },
      { status: 403 },
    );
  }

  const donationId = new URL(request.url).searchParams.get("donationId")?.trim() || null;
  let donationSummary: SimplifiedProofPdfData["donation"] = null;

  if (donationId) {
    const donation = await getDb().donation.findUnique({
      where: { id: donationId },
      select: {
        id: true,
        donationNumber: true,
        receivedAt: true,
        amount: true,
        method: true,
        purposeNote: true,
        reversedAt: true,
      },
    });
    if (!donation) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("donations.errors.donationNotFound") },
        { status: 404 },
      );
    }
    if (donation.reversedAt) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("donations.errors.reversedDonation") },
        { status: 400 },
      );
    }
    if (donation.method === "IN_KIND") {
      return NextResponse.json(
        { ok: false, error: await translateMessage("donations.errors.simplifiedProofNotInKind") },
        { status: 400 },
      );
    }
    const amountCents = Number(donation.amount.mul(100).toFixed(0));
    if (amountCents > SMALL_DONATION_LIMIT_CENTS) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("donations.errors.simplifiedProofLimit") },
        { status: 400 },
      );
    }
    donationSummary = {
      donationNumber: donation.donationNumber,
      receivedAt: donation.receivedAt,
      amountCents,
      purposeNote: donation.purposeNote,
    };
  }

  const [profile, creditorSettings] = await Promise.all([
    getOrganizationProfile(),
    getSepaCreditorSettings().catch(() => ({ iban: null, bic: null, creditorId: null })),
  ]);

  const creditor = creditorSettings.iban
    ? { iban: creditorSettings.iban, bic: creditorSettings.bic }
    : null;

  const data: SimplifiedProofPdfData = {
    organization: {
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      taxNumber: profile.taxNumber,
      taxOffice: profile.taxOffice,
    },
    exemptionDocumentType:
      (profile.exemptionDocumentType as ExemptionDocumentTypeKey | null) ?? null,
    exemptionNoticeDate: profile.exemptionNoticeDate,
    exemptionNoticePeriod: profile.exemptionNoticePeriod,
    charitablePurposes: profile.charitablePurposes,
    taxOffice: profile.taxOffice,
    taxNumber: profile.taxNumber,
    membershipFeesDeductible: profile.membershipFeesDeductible,
    donation: donationSummary,
    creditor,
    issuedAt: new Date(),
  };

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<SimplifiedProofDocument data={data} />);

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "PDF_DOWNLOAD",
    entity: "Donation",
    entityId: donationId ?? undefined,
    after: {
      document: "simplified_proof_300",
      donationNumber: donationSummary?.donationNumber ?? null,
      hasEpcQr: Boolean(creditor),
    },
  });

  const filename = donationSummary
    ? `vereinfachter-spendennachweis-${donationSummary.donationNumber}.pdf`
    : "vereinfachter-spendennachweis-300eur.pdf";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
