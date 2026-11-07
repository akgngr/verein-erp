import { renderToBuffer } from "@react-pdf/renderer";

import { registerSharedPdfFonts } from "@/shared/pdf/fonts";

import { EvidenceDocument } from "./evidence-document";

/** Alt işlem (render-cli.mjs) giriş noktası: girdiyi çizer. */
export async function renderEvidence(input: Parameters<typeof EvidenceDocument>[0]): Promise<Buffer> {
  registerSharedPdfFonts();
  // Girdi JSON ile gelir: tarih alanları metne dönüşür; antet Date bekler (ör. Gemeinnützigkeit tarihi).
  const organization = { ...input.organization, exemptionNoticeDate: input.organization.exemptionNoticeDate ? new Date(input.organization.exemptionNoticeDate) : null };
  return renderToBuffer(<EvidenceDocument {...input} organization={organization} />);
}
