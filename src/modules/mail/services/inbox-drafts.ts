import "server-only";

import { getDb } from "@/shared/db";

import { decryptSecret, encryptSecret } from "./mail-crypto";

/**
 * S4.1 (#313) — yanıt taslakları. Sekreter önerisinin onayı yalnız BOŞ bir taslak açar (1. onay);
 * gövdeyi kullanıcı yazar ve ayrıca "Gönder" der (2. onay). Hiçbir şey kendiliğinden gönderilmez.
 */
export class ReplyDraftError extends Error {}

export const REPLY_BODY_MAX = 5000;

/** İdempotent: kullanıcı başına mesaj başına tek taslak; varsa mevcut döner. */
export async function createReplyDraft(inboxMessageId: string, userId: string): Promise<{ id: string; created: boolean }> {
  const db = getDb();
  const message = await db.mailInboxMessage.findUnique({ where: { id: inboxMessageId }, select: { id: true, fromAddress: true } });
  if (!message?.fromAddress) throw new ReplyDraftError("mail.inbox.drafts.errors.noRecipient");
  const existing = await db.mailReplyDraft.findUnique({ where: { inboxMessageId_userId: { inboxMessageId, userId } }, select: { id: true, status: true } });
  if (existing) {
    if (existing.status === "DISCARDED") await db.mailReplyDraft.update({ where: { id: existing.id }, data: { status: "DRAFT", bodyEnc: null } });
    return { id: existing.id, created: false };
  }
  try {
    const row = await db.mailReplyDraft.create({ data: { inboxMessageId, userId }, select: { id: true } });
    return { id: row.id, created: true };
  } catch {
    // Eşzamanlı ikinci istek: benzersiz kısıt; mevcut taslak döner.
    const row = await db.mailReplyDraft.findUnique({ where: { inboxMessageId_userId: { inboxMessageId, userId } }, select: { id: true } });
    if (!row) throw new ReplyDraftError("mail.inbox.drafts.errors.notFound");
    return { id: row.id, created: false };
  }
}

async function ownDraft(draftId: string, userId: string) {
  const draft = await getDb().mailReplyDraft.findUnique({
    where: { id: draftId },
    select: { id: true, userId: true, status: true, bodyEnc: true, inboxMessage: { select: { id: true, fromAddress: true, fromName: true, subject: true } } },
  });
  // Başkasının taslağı "yok" sayılır (varlığı sızdırılmaz).
  if (!draft || draft.userId !== userId) throw new ReplyDraftError("mail.inbox.drafts.errors.notFound");
  return draft;
}

/** Taslak gövdesini şifreli kaydeder (gönderim yok). */
export async function saveReplyDraftBody(draftId: string, userId: string, body: string): Promise<void> {
  const draft = await ownDraft(draftId, userId);
  if (draft.status !== "DRAFT") throw new ReplyDraftError("mail.inbox.drafts.errors.notEditable");
  const text = body.trim().slice(0, REPLY_BODY_MAX);
  await getDb().mailReplyDraft.update({ where: { id: draftId }, data: { bodyEnc: text ? encryptSecret(text) : null } });
}

export async function readReplyDraft(draftId: string, userId: string) {
  const draft = await ownDraft(draftId, userId);
  return {
    id: draft.id,
    status: draft.status,
    body: draft.bodyEnc ? (decryptSecret(draft.bodyEnc) ?? "") : "",
    subject: replySubject(draft.inboxMessage.subject),
    toName: draft.inboxMessage.fromName,
  };
}

export function replySubject(subject: string): string {
  const clean = subject.replace(/[\r\n]+/g, " ").trim();
  return (/^(re|aw|ynt)\s*:/i.test(clean) ? clean : `Re: ${clean}`).slice(0, 200);
}

export type SendDeps = {
  isMailConfigured: () => Promise<boolean>;
  send: (message: { to: string; toName?: string; subject: string; text: string; context: { module: string; reference?: string } }) => Promise<{ ok: boolean; logId?: string }>;
};

/**
 * İkinci onay: kullanıcının yazdığı gövde ile gönderir. Atomik claim (DRAFT → SENT) ile çift gönderim olmaz;
 * SMTP hatasında taslak DRAFT'a geri döner. Gönderilince gövde silinir (yalnız mail günlüğü kalır).
 */
export async function sendReplyDraft(draftId: string, userId: string, body: string, deps: SendDeps): Promise<{ logId?: string }> {
  const text = body.trim();
  if (!text || text.length > REPLY_BODY_MAX) throw new ReplyDraftError("mail.inbox.drafts.errors.bodyRequired");
  const draft = await ownDraft(draftId, userId);
  if (draft.status !== "DRAFT") throw new ReplyDraftError("mail.inbox.drafts.errors.notEditable");
  const to = draft.inboxMessage.fromAddress;
  if (!to) throw new ReplyDraftError("mail.inbox.drafts.errors.noRecipient");
  if (!(await deps.isMailConfigured())) throw new ReplyDraftError("mail.inbox.drafts.errors.mailNotConfigured");
  const db = getDb();
  const claim = await db.mailReplyDraft.updateMany({ where: { id: draftId, userId, status: "DRAFT" }, data: { status: "SENT", sentAt: new Date() } });
  if (claim.count !== 1) throw new ReplyDraftError("mail.inbox.drafts.errors.notEditable");
  const result = await deps.send({
    to,
    ...(draft.inboxMessage.fromName ? { toName: draft.inboxMessage.fromName } : {}),
    subject: replySubject(draft.inboxMessage.subject),
    text,
    context: { module: "mail", reference: `reply-draft:${draftId}` },
  });
  if (!result.ok) {
    await db.mailReplyDraft.update({ where: { id: draftId }, data: { status: "DRAFT", sentAt: null, bodyEnc: encryptSecret(text) } });
    throw new ReplyDraftError("mail.inbox.drafts.errors.sendFailed");
  }
  await db.mailReplyDraft.update({ where: { id: draftId }, data: { bodyEnc: null, mailLogId: result.logId ?? null } });
  return { logId: result.logId };
}

export async function discardReplyDraft(draftId: string, userId: string): Promise<void> {
  const draft = await ownDraft(draftId, userId);
  if (draft.status !== "DRAFT") throw new ReplyDraftError("mail.inbox.drafts.errors.notEditable");
  await getDb().mailReplyDraft.updateMany({ where: { id: draftId, userId, status: "DRAFT" }, data: { status: "DISCARDED", bodyEnc: null } });
}

/** UI projeksiyonu: yalnız kullanıcının kendi açık taslakları; gövde/adres yok. */
export async function listMyReplyDrafts(userId: string) {
  const rows = await getDb().mailReplyDraft.findMany({
    where: { userId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, inboxMessage: { select: { id: true, subject: true, category: true } } },
  });
  return rows.map((row) => ({ id: row.id, inboxMessageId: row.inboxMessage.id, subject: replySubject(row.inboxMessage.subject), category: row.inboxMessage.category, createdAt: row.createdAt.toISOString() }));
}
