import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { getEnvPdfLangDefault, type PdfLang } from "@/shared/pdf/i18n";

import { EvidenceDocument } from "../pdf/evidence-document";
import { buildEvidencePdfInput } from "./evidence-pdf-input";
import { getEvidence, hasStoredDocument, storeDocument, type EvidenceSnapshot } from "./evidence-store";

/**
 * İmzalı form PDF'i. Next.js istek bağlamı gerektirmez (çeviri doğrudan mesaj dosyasından): hem worker
 * görevi hem de indirme uç noktası kullanır.
 */
/** Next.js içinde çizim (indirme ucu). */
export async function renderEvidencePdf(snapshot: EvidenceSnapshot, signature: string, lang: PdfLang): Promise<Uint8Array> {
  const input = await buildEvidencePdfInput(snapshot, signature, lang);
  registerSharedPdfFonts();
  return renderToBuffer(<EvidenceDocument {...input} />);
}


/** İmza sonrası: belge varsayılan belge dilinde üretilip şifreli saklanır (hata imzayı geçersiz kılmaz). */
export async function storeEvidencePdf(id: string): Promise<void> {
  if (await hasStoredDocument(id)) return;
  const evidence = await getEvidence(id);
  if (!evidence) return;
  await storeDocument(id, await renderEvidencePdf(evidence.snapshot, evidence.signature, getEnvPdfLangDefault()));
}
