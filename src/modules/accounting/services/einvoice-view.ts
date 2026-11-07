import "server-only";

import { getDb } from "@/shared/db";
import { readFile } from "@/shared/files";

import { extractEmbeddedInvoiceXml, isEInvoiceXml } from "./einvoice-in";
import { parseEInvoiceDocument, type EInvoiceDocument } from "./einvoice-document";

/**
 * EI-3: gelen faturanın saklanan ORİJİNAL dosyasından (XRechnung XML veya ZUGFeRD PDF'e gömülü XML)
 * belge yapısını üretir. E-fatura değilse veya dosya okunamazsa null.
 */
export async function loadPayableEInvoice(id: string): Promise<{ document: EInvoiceDocument; supplierName: string | null; sha256: string | null } | null> {
  const payable = await getDb().accountingPayable.findUnique({ where: { id }, select: { storagePath: true, source: true, supplierName: true, sha256: true } });
  if (!payable?.storagePath || (payable.source !== "XRECHNUNG" && payable.source !== "ZUGFERD")) return null;
  try {
    const buffer = await readFile(payable.storagePath);
    const xml = payable.source === "ZUGFERD" ? extractEmbeddedInvoiceXml(buffer) : buffer.toString("utf8");
    if (!xml || !isEInvoiceXml(xml)) return null;
    return { document: parseEInvoiceDocument(xml), supplierName: payable.supplierName, sha256: payable.sha256 };
  } catch {
    return null;
  }
}
