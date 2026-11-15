import "server-only";

import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { computeSha256, makeStoredName, removeFile, saveFile } from "@/shared/files";

import { EInvoiceParseError, extractEmbeddedInvoiceXml, isEInvoiceXml, parseEInvoice, type ParsedEInvoice } from "./einvoice-in";
import { validateIncoming } from "./einvoice-validate";

const toDate = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null);

/**
 * Gelen belgeyi (PDF/XML/görsel) gelen faturalar kutusuna TASLAK olarak alır: XRechnung XML veya
 * ZUGFeRD PDF ise alanlar okunur; aynı dosya (SHA-256) ikinci kez alınmaz. Dosya yükleme ve
 * e-posta (IMAP) içe aktarma aynı yolu kullanır. Uzantı/tür doğrulaması çağıranın işidir.
 */
/** Gelen fatura taslağı için dış öneriler (doğrulanmış). Tutar KDV dağılımı bilinmediği için notta kalır. */
export const payablePrefillSchema = z.object({
  supplierName: z.string().trim().min(1).max(150).optional(),
  number: z.string().trim().min(1).max(64).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  iban: z.string().trim().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();
export type PayablePrefill = z.infer<typeof payablePrefillSchema>;

export async function importPayableFile(input: {
  buffer: Buffer;
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  actor: { id: string; label: string };
  /** Denetim kaydı için kaynak (ör. "upload", "email", "document"). */
  channel?: string;
  /** E-fatura değilse taslağa yazılacak öneriler (ör. evrak OCR'ından); e-fatura her zaman önceliklidir. */
  prefill?: PayablePrefill;
}): Promise<{ ok: true; id: string; source: string } | { ok: false; reason: "duplicate"; id: string }> {
  const db = getDb();
  const sha256 = computeSha256(input.buffer);
  const duplicate = await db.accountingPayable.findFirst({ where: { sha256, status: { not: "CANCELLED" } }, select: { id: true } });
  if (duplicate) return { ok: false, reason: "duplicate", id: duplicate.id };

  // E-fatura okuma (başarısızsa düz belge olarak devam).
  let einvoice: ParsedEInvoice | null = null;
  let source = "MANUAL";
  try {
    if (input.extension === "xml") {
      const text = input.buffer.toString("utf8");
      if (isEInvoiceXml(text)) {
        einvoice = parseEInvoice(text);
        source = "XRECHNUNG";
      }
    } else if (input.extension === "pdf") {
      const xml = extractEmbeddedInvoiceXml(input.buffer);
      if (xml) {
        einvoice = parseEInvoice(xml);
        source = "ZUGFERD";
      }
    }
  } catch (error) {
    if (!(error instanceof EInvoiceParseError)) console.error("[accounting/payables] e-fatura okunamadı:", error);
    einvoice = null;
    source = "MANUAL";
  }
  if (einvoice && einvoice.currency !== "EUR") einvoice = null;

  const contact = einvoice
    ? await db.accountingContact.findFirst({
        where: { type: "SUPPLIER", isActive: true, OR: [...(einvoice.sellerVatId ? [{ vatId: einvoice.sellerVatId }] : []), ...(einvoice.sellerName ? [{ name: { equals: einvoice.sellerName, mode: "insensitive" as const } }] : [])] },
        select: { id: true },
      })
    : null;

  const year = new Date().getUTCFullYear();
  const storagePath = ["accounting", "payables", String(year), makeStoredName(input.extension)].join("/");
  await saveFile(storagePath, input.buffer);
  try {
    const created = await db.accountingPayable.create({
      data: {
        status: "DRAFT",
        source,
        contactId: contact?.id ?? null,
        supplierName: einvoice?.sellerName ?? input.prefill?.supplierName ?? "",
        supplierVatId: einvoice?.sellerVatId ?? null,
        supplierTaxNumber: einvoice?.sellerTaxNumber ?? null,
        supplierAddress: einvoice?.sellerAddress ?? null,
        supplierIban: einvoice?.sellerIban ?? (einvoice ? null : input.prefill?.iban ?? null),
        number: einvoice?.number ?? (einvoice ? null : input.prefill?.number ?? null),
        issueDate: toDate(einvoice?.issueDate ?? (einvoice ? null : input.prefill?.issueDate ?? null)),
        dueDate: toDate(einvoice?.dueDate ?? (einvoice ? null : input.prefill?.dueDate ?? null)),
        notes: einvoice ? null : input.prefill?.notes ?? null,
        serviceDate: einvoice?.serviceDate ?? null,
        byRate: einvoice?.byRate ?? [],
        einvoiceIssues: einvoice ? validateIncoming(einvoice) : undefined,
        netCents: einvoice?.netCents ?? 0,
        taxCents: einvoice?.taxCents ?? 0,
        grossCents: einvoice?.grossCents ?? 0,
        originalName: input.originalName,
        storagePath,
        mimeType: input.mimeType,
        size: input.size,
        sha256,
        createdById: input.actor.id,
        createdByLabel: input.actor.label,
      },
    });
    await writeAudit({ userId: input.actor.id, userLabel: input.actor.label, action: "FILE_UPLOAD", entity: "AccountingPayable", entityId: created.id, after: { source, size: input.size, channel: input.channel ?? "upload" } });
    return { ok: true, id: created.id, source };
  } catch (error) {
    await removeFile(storagePath);
    throw error;
  }
}
