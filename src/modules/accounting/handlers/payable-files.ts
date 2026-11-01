import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { buildDownloadResponse, computeSha256, makeStoredName, openReadStream, parseSingleFileUpload, removeFile, saveFile, uploadErrorMessage, validateUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { EInvoiceParseError, extractEmbeddedInvoiceXml, isEInvoiceXml, parseEInvoice, type ParsedEInvoice } from "../services/einvoice-in";

export const PAYABLE_FILE_EXTENSIONS = ["pdf", "xml", "jpg", "jpeg", "png"] as const;

async function authorize(action: "view" | "create") {
  try {
    const user = await requireUser();
    if (!can(user.role, accountingPermissions, action)) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 }) };
    return { user };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 }) };
    throw error;
  }
}

const toDate = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null);

/**
 * POST /api/accounting/payables — belge yükle (PDF/XML/görsel). XRechnung XML veya ZUGFeRD PDF ise
 * alanlar okunur ve TASLAK önceden doldurulur; aynı dosya (SHA-256) ikinci kez yüklenmez.
 */
export async function uploadPayableHandler(request: Request): Promise<Response> {
  const auth = await authorize("create");
  if ("error" in auth) return auth.error as Response;
  const { user } = auth;

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const validation = validateUpload({
    file: { originalName: parsed.file.originalName, declaredMime: parsed.file.declaredMime, size: parsed.file.size, head: parsed.file.head },
    allowedExtensions: PAYABLE_FILE_EXTENSIONS,
    maxBytes: getEnv().MAX_UPLOAD_MB * 1024 * 1024,
  });
  if (!validation.ok) return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });

  const db = getDb();
  const sha256 = computeSha256(parsed.file.buffer);
  const duplicate = await db.accountingPayable.findFirst({ where: { sha256, status: { not: "CANCELLED" } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ ok: false, error: await translateMessage("accounting.payables.errors.duplicate"), id: duplicate.id }, { status: 409 });

  // E-fatura okuma (başarısızsa düz belge olarak devam).
  let einvoice: ParsedEInvoice | null = null;
  let source = "MANUAL";
  try {
    const buffer = Buffer.from(parsed.file.buffer);
    if (validation.file.extension === "xml") {
      const text = buffer.toString("utf8");
      if (isEInvoiceXml(text)) {
        einvoice = parseEInvoice(text);
        source = "XRECHNUNG";
      }
    } else if (validation.file.extension === "pdf") {
      const xml = extractEmbeddedInvoiceXml(buffer);
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
  const storagePath = ["accounting", "payables", String(year), makeStoredName(validation.file.extension)].join("/");
  await saveFile(storagePath, parsed.file.buffer);
  try {
    const actorLabel = buildUserLabel(user.name, user.email);
    const created = await db.accountingPayable.create({
      data: {
        status: "DRAFT",
        source,
        contactId: contact?.id ?? null,
        supplierName: einvoice?.sellerName ?? "",
        supplierVatId: einvoice?.sellerVatId ?? null,
        supplierTaxNumber: einvoice?.sellerTaxNumber ?? null,
        supplierAddress: einvoice?.sellerAddress ?? null,
        supplierIban: einvoice?.sellerIban ?? null,
        number: einvoice?.number ?? null,
        issueDate: toDate(einvoice?.issueDate ?? null),
        dueDate: toDate(einvoice?.dueDate ?? null),
        serviceDate: einvoice?.serviceDate ?? null,
        byRate: einvoice?.byRate ?? [],
        netCents: einvoice?.netCents ?? 0,
        taxCents: einvoice?.taxCents ?? 0,
        grossCents: einvoice?.grossCents ?? 0,
        originalName: validation.file.originalName,
        storagePath,
        mimeType: validation.file.mimeType,
        size: validation.file.size,
        sha256,
        createdById: user.id,
        createdByLabel: actorLabel,
      },
    });
    await writeAudit({ userId: user.id, userLabel: actorLabel, action: "FILE_UPLOAD", entity: "AccountingPayable", entityId: created.id, after: { source, size: validation.file.size } });
    return NextResponse.json({ ok: true, id: created.id, source });
  } catch (error) {
    await removeFile(storagePath);
    throw error;
  }
}

/** GET /api/accounting/payables/[id]/file — belge (Beleg) indir / görüntüle. */
export async function downloadPayableFileHandler(request: Request, id: string): Promise<Response> {
  const auth = await authorize("view");
  if ("error" in auth) return auth.error as Response;
  const payable = await getDb().accountingPayable.findUnique({ where: { id }, select: { storagePath: true, originalName: true, mimeType: true } });
  if (!payable?.storagePath || !payable.originalName) return NextResponse.json({ ok: false, error: await translateMessage("accounting.payables.errors.notFound") }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return buildDownloadResponse({ stream: openReadStream(payable.storagePath), originalName: payable.originalName, mimeType: payable.mimeType ?? "application/octet-stream", inline });
}
