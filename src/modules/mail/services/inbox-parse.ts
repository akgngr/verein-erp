import "server-only";

import { simpleParser } from "mailparser";

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

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

/**
 * Ham e-postayı (RFC 822) ayrıştırır. KVKK: gövdeden yalnızca ilk 300 karakter özet alınır;
 * yalnızca belge türündeki ekler döner (en fazla 20 MB), diğerleri sayılır ama saklanmaz.
 */
export async function parseInboxMessage(raw: Buffer, fallbackDate = new Date()): Promise<ParsedInboxMessage> {
  const mail = await simpleParser(raw, { skipHtmlToText: false, skipTextToHtml: true, skipImageLinks: true });
  const from = mail.from?.value?.[0];
  const text = (mail.text ?? "").replace(/\s+/g, " ").trim();
  const attachments: ParsedInboxMessage["attachments"] = [];
  let skipped = 0;
  for (const attachment of mail.attachments ?? []) {
    const fileName = (attachment.filename ?? "").replace(/[\\/\0]/g, "_").slice(0, 200);
    const extension = extensionOf(fileName);
    if (!fileName || !(INBOX_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension) || attachment.size > MAX_ATTACHMENT_BYTES) {
      skipped += 1;
      continue;
    }
    attachments.push({ fileName, mimeType: attachment.contentType || "application/octet-stream", extension, content: attachment.content });
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
