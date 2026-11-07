import { renderToBuffer } from "@react-pdf/renderer";

import { registerSharedPdfFonts } from "@/shared/pdf/fonts";

import { EvidenceDocument } from "./evidence-document";

/** Alt işlem (render-cli.mjs) giriş noktası: girdiyi çizer. */
export async function renderEvidence(input: Parameters<typeof EvidenceDocument>[0]): Promise<Buffer> {
  registerSharedPdfFonts();
  return renderToBuffer(<EvidenceDocument {...input} />);
}
