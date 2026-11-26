import "server-only";

import { simpleParser } from "mailparser";

import { validateUpload } from "@/shared/files/validation";

/** İçe alınabilen ek türleri (gelen belge kutusu ile aynı). Diğer ekler saklanmaz. */
export const INBOX_ATTACHMENT_EXTENSIONS = ["pdf", "xml", "jpg", "jpeg", "png"] as const;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type ParsedInboxMessage = {
  messageId: string | null;
  fromAddress: string | null;
  fromName: string | null;
  subject: string;
  receivedAt: Date;
  snippet: string | null;
  attachments: { fileName: string; mimeType: string; extension: string; content: Buffer }[];
  skippedAttachments: number;
};

function looksLikeSafeInvoiceXml(content: Buffer): boolean {
  const head = content
    .subarray(0, 4096)
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (!head.startsWith("<")) return false;
  if (/^<!doctype\s+html\b|^<html\b|^<script\b|^<svg\b/i.test(head)) return false;
  return !/<script\b/i.test(head);
}

/**
 * Ham e-postayı (RFC 822) ayrıştırır. KVKK: gövdeden yalnızca ilk 300 karakter özet alınır;
 * yalnızca belge türündeki ekler döner (en fazla 20 MB), diğerleri sayılır ama saklanmaz.
 * Her ek magic-byte doğrulamasından geçer ve kanonik MIME türü atanır.
 */
export async function parseInboxMessage(raw: Buffer, fallbackDate = new Date()): Promise<ParsedInboxMessage> {
  const mail = await simpleParser(raw, { skipHtmlToText: false, skipTextToHtml: true, skipImageLinks: true });
  const from = mail.from?.value?.[0];
  const text = (mail.text ?? "").replace(/\s+/g, " ").trim();
  const attachments: ParsedInboxMessage["attachments"] = [];
  let skipped = 0;
  for (const attachment of mail.attachments ?? []) {
    const rawName = (attachment.filename ?? "").replace(/[\\/\0]/g, "_").slice(0, 200);
    const content = attachment.content;
    if (!rawName || !content || content.byteLength === 0 || content.byteLength > MAX_ATTACHMENT_BYTES) {
      skipped += 1;
      continue;
    }
    const validated = validateUpload({
      file: {
        originalName: rawName,
        declaredMime: attachment.contentType || "application/octet-stream",
        size: content.byteLength,
        head: new Uint8Array(content.subarray(0, 65_536)),
      },
      allowedExtensions: INBOX_ATTACHMENT_EXTENSIONS,
      maxBytes: MAX_ATTACHMENT_BYTES,
    });
    if (!validated.ok) {
      skipped += 1;
      continue;
    }
    if (validated.file.extension === "xml" && !looksLikeSafeInvoiceXml(content)) {
      skipped += 1;
      continue;
    }
    attachments.push({
      fileName: validated.file.originalName,
      mimeType: validated.file.mimeType,
      extension: validated.file.extension,
      content,
    });
  }
  return {
    messageId: mail.messageId ?? null,
    fromAddress: from?.address ?? null,
    fromName: from?.name || null,
    subject: (mail.subject ?? "").slice(0, 300),
    receivedAt: mail.date ?? fallbackDate,
    snippet: text ? text.slice(0, 300) : null,
    attachments,
    skippedAttachments: skipped,
  };
}
