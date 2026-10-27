import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { can } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";
import { ConfirmationDocument, type ConfirmationPdfData } from "../pdf/confirmation-document";

/**
 * Şablon önizleme (§ 13): ?type=single-donation|collective-donation|single-fee|
 * collective-fee|attachment — bariz uydurma örnek veri; her sayfada büyük
 * "MUSTER – KEINE GÜLTIGE BESTÄTIGUNG"; numarasız; DEPOLANMAZ. İzin donations.view.
 */
export async function templatePreviewPdfHandler(request: Request): Promise<Response> {
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

  const type = new URL(request.url).searchParams.get("type") ?? "single-donation";
  const isCollective = type.startsWith("collective");
  const content = type.endsWith("fee") ? "MEMBERSHIP_FEE" : "DONATION";

  const data: ConfirmationPdfData = {
    organization: {
      name: "Muster-Verein e.V. (ÖRNEK DERNEK)",
      street: "Musterstraße 1",
      postalCode: "12345",
      city: "Musterstadt",
      taxNumber: "123/456/78901",
      taxOffice: "Finanzamt Musterstadt",
    },
    confirmationNumber: null,
    isPreview: true,
    kind: isCollective ? "COLLECTIVE" : "SINGLE",
    content,
    recipient: {
      kind: "donor",
      name: "Erika Mustermann (ÖRNEK)",
      street: "Beispielweg 2",
      postalCode: "54321",
      city: "Beispielstadt",
      country: "Deutschland",
    },
    totalCents: 123456,
    amountInWords: "eintausendzweihundertvierunddreißig Euro und sechsundfünfzig Cent",
    periodFrom: new Date("2026-01-01T00:00:00Z"),
    periodTo: new Date("2026-12-31T00:00:00Z"),
    waived: type.includes("waiver"),
    membershipFeesDeductible: false,
    items: isCollective
      ? [
          { position: 1, itemType: "DONATION", sourceId: "x1", itemDate: new Date("2026-02-01T00:00:00Z"), amountCents: 50000, label: "Geldspende", waived: false },
          { position: 2, itemType: "DONATION", sourceId: "x2", itemDate: new Date("2026-06-15T00:00:00Z"), amountCents: 73456, label: "Geldspende", waived: false },
        ]
      : undefined,
    issuedPlace: "Musterstadt",
    issueDate: new Date(),
    attachment: isCollective,
    issuerSnapshotData: {
      exemptionDocumentType: "EXEMPTION_NOTICE",
      charitablePurposes: "der Volks- und Berufsbildung sowie der Kunst und Kultur",
      taxOffice: "Finanzamt Musterstadt",
      taxNumber: "123/456/78901",
      exemptionNoticeDate: "2023-06-15",
      exemptionNoticePeriod: "2020 bis 2022",
      membershipFeesDeductible: false,
    },
  };

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<ConfirmationDocument data={data} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="muster-${type}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
