import "server-only";

import { createHash } from "node:crypto";

import { ImapFlow } from "imapflow";

import { importPayableFile } from "@/modules/accounting/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getDb } from "@/shared/db";
import { makeStoredName, readFile, removeFile, saveFile } from "@/shared/files";

import { decryptSecret, encryptSecret } from "./mail-crypto";
import { parseInboxMessage, type ParsedInboxMessage } from "./inbox-parse";

const FIRST_FETCH_DAYS = 30;
const MAX_PER_FETCH = 100;

export type InboxSettingsView = { host: string | null; port: number; security: string; username: string | null; hasPassword: boolean; mailbox: string; lastFetchAt: Date | null; lastError: string | null };

export async function getInboxSettings(): Promise<InboxSettingsView> {
  const row = await getDb().mailInboxSettings.findUnique({ where: { id: "default" } });
  return {
    host: row?.host ?? null,
    port: row?.port ?? 993,
    security: row?.security ?? "SSL",
    username: row?.username ?? null,
    hasPassword: Boolean(row?.passwordEncrypted),
    mailbox: row?.mailbox ?? "INBOX",
    lastFetchAt: row?.lastFetchAt ?? null,
    lastError: row?.lastError ?? null,
  };
}

export async function saveInboxSettings(input: { host: string; port: number; security: string; username: string; password: string; mailbox: string }) {
  const current = await getDb().mailInboxSettings.findUnique({ where: { id: "default" } });
  const data = {
    host: input.host || null,
    port: input.port,
    security: input.security,
    username: input.username || null,
    mailbox: input.mailbox || "INBOX",
    ...(input.password ? { passwordEncrypted: encryptSecret(input.password) } : {}),
    // Sunucu/hesap/klasör değişirse okuma baştan başlar.
    ...(current && (current.host !== (input.host || null) || current.username !== (input.username || null) || current.mailbox !== (input.mailbox || "INBOX")) ? { lastUid: null, uidValidity: null } : {}),
  };
  await getDb().mailInboxSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
}

/** Ayrıştırılmış e-postayı ve belge eklerini kaydeder; aynı anahtar ikinci kez kaydedilmez. */
async function storeMessage(parsed: ParsedInboxMessage, source: "IMAP" | "EML", externalKey: string): Promise<boolean> {
  const db = getDb();
  if (await db.mailInboxMessage.findUnique({ where: { externalKey }, select: { id: true } })) return false;
  const year = new Date().getUTCFullYear();
  const stored: { fileName: string; mimeType: string; extension: string; size: number; storagePath: string }[] = [];
  try {
    for (const attachment of parsed.attachments) {
      const storagePath = ["mail", "inbox", String(year), makeStoredName(attachment.extension)].join("/");
      await saveFile(storagePath, attachment.content);
      stored.push({ fileName: attachment.fileName, mimeType: attachment.mimeType, extension: attachment.extension, size: attachment.content.length, storagePath });
    }
    await db.mailInboxMessage.create({
      data: {
        source,
        externalKey,
        messageId: parsed.messageId?.slice(0, 300) ?? null,
        fromAddress: parsed.fromAddress?.slice(0, 200) ?? null,
        fromName: parsed.fromName?.slice(0, 200) ?? null,
        subject: parsed.subject,
        receivedAt: parsed.receivedAt,
        snippet: parsed.snippet,
        status: stored.length ? "NEW" : "DONE",
        attachments: { create: stored },
      },
    });
    return true;
  } catch (error) {
    for (const file of stored) await removeFile(file.storagePath);
    throw error;
  }
}

/** Kaydedilmiş bir e-posta dosyasını (.eml) içe alır. */
export async function importEml(raw: Buffer): Promise<{ created: boolean; attachments: number }> {
  const parsed = await parseInboxMessage(raw);
  const key = `eml:${createHash("sha256").update(raw).digest("hex")}`;
  const created = await storeMessage(parsed, "EML", key);
  return { created, attachments: parsed.attachments.length };
}

/**
 * IMAP klasörünü SALT OKUNUR açar ve son okunandan sonraki e-postaları alır (ilk seferde son 30 gün,
 * en fazla 100). Sunucuda hiçbir şey silinmez veya okundu işaretlenmez.
 */
export async function fetchImap(): Promise<{ fetched: number; created: number }> {
  const db = getDb();
  const settings = await db.mailInboxSettings.findUnique({ where: { id: "default" } });
  if (!settings?.host || !settings.username || !settings.passwordEncrypted) throw new Error("inbox:notConfigured"); // i18n-ignore (iç hata kodu; mail.inbox.errors.* ile çevrilir)
  const password = decryptSecret(settings.passwordEncrypted);
  if (!password) throw new Error("inbox:passwordUnreadable"); // i18n-ignore (iç hata kodu; mail.inbox.errors.* ile çevrilir)
  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "SSL",
    doSTARTTLS: settings.security === "STARTTLS" ? true : settings.security === "NONE" ? false : undefined,
    auth: { user: settings.username, pass: password },
    logger: false,
    socketTimeout: 60_000,
  });
  let fetched = 0;
  let created = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(settings.mailbox, { readOnly: true });
    try {
      const mailbox = client.mailbox;
      const uidValidity = mailbox ? String(mailbox.uidValidity) : "0";
      const resume = settings.uidValidity === uidValidity && settings.lastUid ? settings.lastUid : null;
      let uids: number[];
      if (resume) {
        const found = await client.search({ uid: `${resume + 1}:*` }, { uid: true });
        uids = (found || []).filter((uid) => uid > resume);
      } else {
        const since = new Date(Date.now() - FIRST_FETCH_DAYS * 86_400_000);
        uids = (await client.search({ since }, { uid: true })) || [];
      }
      uids = uids.sort((a, b) => a - b).slice(0, MAX_PER_FETCH);
      let lastUid = resume ?? 0;
      for (const uid of uids) {
        const message = await client.fetchOne(String(uid), { uid: true, source: true, internalDate: true }, { uid: true });
        if (!message || !message.source) continue;
        fetched += 1;
        const internalDate = message.internalDate ? new Date(message.internalDate) : new Date();
        const parsed = await parseInboxMessage(message.source, internalDate);
        if (await storeMessage(parsed, "IMAP", `${uidValidity}:${uid}`)) created += 1;
        lastUid = Math.max(lastUid, uid);
      }
      await db.mailInboxSettings.update({ where: { id: "default" }, data: { lastUid: lastUid || null, uidValidity, lastFetchAt: new Date(), lastError: null } });
    } finally {
      lock.release();
    }
  } catch (error) {
    // KVKK/güvenlik: ayrıntılı sunucu yanıtı saklanmaz, yalnızca kısa hata kodu.
    const code = error instanceof Error && error.message.startsWith("inbox:") ? error.message.slice(6) : "connectionFailed";
    await db.mailInboxSettings.update({ where: { id: "default" }, data: { lastError: code, lastFetchAt: new Date() } });
    console.error("[mail/inbox] fetch failed:", error instanceof Error ? error.message : error);
    throw new Error(`inbox:${code}`); // i18n-ignore (iç hata kodu; mail.inbox.errors.* ile çevrilir)
  } finally {
    await client.logout().catch(() => undefined);
  }
  return { fetched, created };
}

export async function listInboxMessages(status: "NEW" | "DONE" | null) {
  return getDb().mailInboxMessage.findMany({
    where: status ? { status } : {},
    orderBy: { receivedAt: "desc" },
    take: 100,
    include: { attachments: { select: { id: true, fileName: true, extension: true, size: true, importedTo: true, importedAt: true } } },
  });
}

export async function isAccountingUsable(): Promise<boolean> {
  return (await listUsableModuleKeys()).includes("accounting");
}

/** Eki muhasebe gelen faturalar kutusuna aktarır. Tüm ekler aktarıldıysa e-posta "tamamlandı" olur. */
export async function importAttachmentToAccounting(attachmentId: string, actor: { id: string; label: string }): Promise<{ ok: true; payableId: string; source: string } | { ok: false; reason: "duplicate"; payableId: string }> {
  const db = getDb();
  const attachment = await db.mailInboxAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
  const buffer = await readFile(attachment.storagePath);
  const result = await importPayableFile({ buffer, originalName: attachment.fileName, extension: attachment.extension === "jpeg" ? "jpg" : attachment.extension, mimeType: attachment.mimeType, size: attachment.size, actor, channel: "email" });
  const payableId = result.id;
  await db.mailInboxAttachment.update({ where: { id: attachmentId }, data: { importedTo: `accounting.payable:${payableId}`, importedAt: new Date() } });
  const open = await db.mailInboxAttachment.count({ where: { messageId: attachment.messageId, importedTo: null } });
  if (open === 0) await db.mailInboxMessage.update({ where: { id: attachment.messageId }, data: { status: "DONE" } });
  return result.ok ? { ok: true, payableId, source: result.source } : { ok: false, reason: "duplicate", payableId };
}

export async function setMessageStatus(id: string, status: "NEW" | "DONE") {
  await getDb().mailInboxMessage.update({ where: { id }, data: { status } });
}

/** E-postayı ve saklanan eklerini siler (muhasebeye aktarılmış kopyalar etkilenmez). */
export async function deleteInboxMessage(id: string) {
  const db = getDb();
  const attachments = await db.mailInboxAttachment.findMany({ where: { messageId: id }, select: { storagePath: true } });
  await db.mailInboxMessage.delete({ where: { id } });
  for (const file of attachments) await removeFile(file.storagePath);
}

export async function getAttachmentFile(id: string) {
  return getDb().mailInboxAttachment.findUnique({ where: { id }, select: { storagePath: true, fileName: true, mimeType: true } });
}
