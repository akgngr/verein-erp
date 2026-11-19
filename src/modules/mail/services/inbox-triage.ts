import "server-only";

import { getDb } from "@/shared/db";

import { classifyInboxMeta, type TriageCategory } from "./inbox-triage-rules";

/** Kurum düzeyinde sınıflama açık mı (yönetici opt-in; varsayılan kapalı). */
export async function isTriageEnabled(): Promise<boolean> {
  const row = await getDb().mailInboxSettings.findUnique({ where: { id: "default" }, select: { triageEnabled: true } });
  return row?.triageEnabled === true;
}

export async function setTriageEnabled(enabled: boolean): Promise<void> {
  await getDb().mailInboxSettings.upsert({ where: { id: "default" }, create: { id: "default", triageEnabled: enabled }, update: { triageEnabled: enabled } });
}

/**
 * Tek mesajı yerel kurallarla sınıflar. İdempotent: yalnız henüz sınıflanmamış satır güncellenir
 * (eşzamanlı iki çağrıdan yalnız biri yazar). Kurum düzeyinde kapalıysa hiçbir şey yapmaz.
 */
export async function triageInboxMessage(id: string): Promise<TriageCategory | null> {
  if (!(await isTriageEnabled())) return null;
  const db = getDb();
  const message = await db.mailInboxMessage.findUnique({
    where: { id },
    select: { subject: true, fromAddress: true, category: true, attachments: { select: { extension: true } } },
  });
  if (!message) return null;
  if (message.category) return message.category as TriageCategory;
  const category = classifyInboxMeta({ subject: message.subject, fromAddress: message.fromAddress, attachmentExtensions: message.attachments.map((a) => a.extension) });
  const updated = await db.mailInboxMessage.updateMany({ where: { id, category: null }, data: { category, triagedAt: new Date() } });
  if (updated.count === 0) {
    const current = await db.mailInboxMessage.findUnique({ where: { id }, select: { category: true } });
    return (current?.category as TriageCategory | null) ?? null;
  }
  return category;
}

/** Kullanıcı rızası (opt-in); kayıt yoksa sekreter posta önerisi göstermez. */
export async function hasTriageOptIn(userId: string): Promise<boolean> {
  return Boolean(await getDb().mailTriageOptIn.findUnique({ where: { userId }, select: { userId: true } }));
}

export async function setTriageOptIn(userId: string, enabled: boolean): Promise<void> {
  const db = getDb();
  if (enabled) await db.mailTriageOptIn.upsert({ where: { userId }, create: { userId }, update: {} });
  else {
    // Rıza geri alınınca kullanıcının açık taslakları da silinir (gövde dahil).
    await db.$transaction([
      db.mailTriageOptIn.deleteMany({ where: { userId } }),
      db.mailReplyDraft.deleteMany({ where: { userId, status: "DRAFT" } }),
    ]);
  }
}
