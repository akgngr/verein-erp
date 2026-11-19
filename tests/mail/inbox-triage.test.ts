/**
 * S4.1 (#313) — gelen posta meta olayı, yerel sınıflama, rıza kapısı ve iki aşamalı onaylı taslaklar.
 * Gerçek DB testleri yalnız izole test veritabanında çalışır (CI: AI_TEST_DATABASE_URL).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { mailMessageReceivedEvent } from "@/modules/mail/automation";
import { buildTriageItems, secretary as mailSecretary } from "@/modules/mail/secretary";
import { classifyInboxMeta, senderDomain, TRIAGE_SUGGESTION } from "@/modules/mail/services/inbox-triage-rules";
import type { SendDeps } from "@/modules/mail/services/inbox-drafts";
import { getDb } from "@/shared/db";
import { validateModuleSecretary, type SecretaryContext } from "@/shared/secretary/define";

const t: SecretaryContext["t"] = (key) => key;

test("triage: yalnız meta ile yerel ve deterministik sınıflama (TR/DE/EN)", () => {
  const cases: [string, string][] = [
    ["Rechnung Nr. 2026-11", "invoice"],
    ["Fatura hk.", "invoice"],
    ["Genel kurul toplantısı daveti", "meeting"],
    ["Einladung zur Mitgliederversammlung", "meeting"],
    ["Üyelik başvurusu", "membership"],
    ["Kündigung meiner Mitgliedschaft", "membership"],
    ["Bağış makbuzu", "donation"],
    ["Spendenquittung 2026", "donation"],
    ["Kurs saatleri hakkında soru", "question"],
    ["Wann ist das Training?", "question"],
    ["Hallo", "other"],
  ];
  for (const [subject, expected] of cases) assert.equal(classifyInboxMeta({ subject }), expected, subject);
  assert.equal(classifyInboxMeta({ subject: "x", attachmentExtensions: ["xml"] }), "invoice", "e-fatura eki");
  assert.equal(classifyInboxMeta({ subject: "Beleg", attachmentExtensions: ["pdf"] }), "invoice");
  // Sınıflayıcının girdisinde gövde/özet alanı yoktur; ek alanlar yok sayılır.
  assert.equal(classifyInboxMeta({ subject: "Hallo", body: "Rechnung" } as never), "other");
  assert.equal(senderDomain("Ali.Veli@Example.TEST"), "example.test");
  assert.equal(senderDomain("bozuk"), null);
});

test("event: mail.message_received yalnız kimlik/sayı taşır; kişisel alan reddedilir", () => {
  const ok = { inboxMessageId: "m1", source: "IMAP", attachmentCount: 1, category: "question" };
  assert.ok(mailMessageReceivedEvent.payloadSchema.safeParse(ok).success);
  for (const extra of [{ fromAddress: "a@b.test" }, { subject: "Gizli" }, { snippet: "x" }, { fromName: "Ali" }]) {
    assert.equal(mailMessageReceivedEvent.payloadSchema.safeParse({ ...ok, ...extra }).success, false, Object.keys(extra)[0]);
  }
  assert.equal(mailMessageReceivedEvent.payloadSchema.safeParse({ ...ok, category: "secret" }).success, false);
});

test("secretary: sözleşme geçerli; öğe adres/özet taşımaz; fatura ve diğer için öneri yok", () => {
  assert.deepEqual(validateModuleSecretary("mail", mailSecretary), []);
  const now = new Date("2031-03-01T08:00:00Z");
  const rows = (["question", "membership", "meeting", "donation", "invoice", "other"] as const).map((category, index) => ({
    id: `msg${index}`, category, fromName: "Ali Veli", subject: `Konu ${"x".repeat(200)}\nSatır`, receivedAt: now,
  }));
  const items = buildTriageItems(rows, { t });
  assert.deepEqual(items.map((item) => item.id), ["mail:triage:msg0", "mail:triage:msg1", "mail:triage:msg2", "mail:triage:msg3"]);
  for (const item of items) {
    assert.equal(item.href, "/mail/gelen-kutusu");
    assert.ok((item.detail ?? "").length <= 80 && !(item.detail ?? "").includes("\n"));
    assert.ok(!JSON.stringify(item).includes("@"), "adres yok");
    assert.equal(item.suggestion?.action, TRIAGE_SUGGESTION[rows.find((row) => `mail:triage:${row.id}` === item.id)!.category]);
  }
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: kapalıyken sınıflama yok; açıkken idempotent; rıza olmadan öneri yok; taslak iki onaylı", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `tri-${randomUUID().slice(0, 8)}`;
  const { triageInboxMessage, setTriageEnabled, setTriageOptIn, isTriageEnabled } = await import("@/modules/mail/services/inbox-triage");
  const drafts = await import("@/modules/mail/services/inbox-drafts");
  const before = await isTriageEnabled();
  const owner = await db.user.create({ data: { name: tag, email: `o-${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const other = await db.user.create({ data: { name: tag, email: `x-${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const message = await db.mailInboxMessage.create({ data: { source: "EML", externalKey: `${tag}:1`, subject: `${tag} Frage zum Training?`, fromAddress: `sender-${tag}@example.test`, receivedAt: new Date() } });
  const collect = (userId: string) => mailSecretary.providers[0].collect({ user: { id: userId, role: "ADMIN" }, now: new Date(), t });
  const sent: string[] = [];
  const deps = (ok: boolean): SendDeps => ({ isMailConfigured: async () => true, send: async (m) => { sent.push(m.to); return ok ? { ok: true, logId: "log1" } : { ok: false }; } });
  try {
    await setTriageEnabled(false);
    assert.equal(await triageInboxMessage(message.id), null);
    assert.equal((await db.mailInboxMessage.findUniqueOrThrow({ where: { id: message.id } })).category, null, "kurum kapalı → sınıf yok");

    await setTriageEnabled(true);
    const [a, b] = await Promise.all([triageInboxMessage(message.id), triageInboxMessage(message.id)]);
    assert.equal(a, "question");
    assert.equal(b, "question");
    const row = await db.mailInboxMessage.findUniqueOrThrow({ where: { id: message.id } });
    assert.equal(row.category, "question");

    assert.ok(!(await collect(owner.id)).some((item) => item.id === `mail:triage:${message.id}`), "rıza yok → öneri yok");
    await setTriageOptIn(owner.id, true);
    assert.ok((await collect(owner.id)).some((item) => item.id === `mail:triage:${message.id}`), "rıza var → öneri");

    // 1. onay: boş taslak (idempotent).
    const first = await drafts.createReplyDraft(message.id, owner.id);
    const again = await drafts.createReplyDraft(message.id, owner.id);
    assert.equal(first.id, again.id);
    assert.equal(again.created, false);
    assert.ok(!(await collect(owner.id)).some((item) => item.id === `mail:triage:${message.id}`), "taslak açıldı → tekrar önerilmez");

    // Başkası göremez/gönderemez; metin olmadan gönderim yok.
    await assert.rejects(() => drafts.readReplyDraft(first.id, other.id), /notFound/);
    await assert.rejects(() => drafts.sendReplyDraft(first.id, other.id, "Merhaba", deps(true)), /notFound/);
    await assert.rejects(() => drafts.sendReplyDraft(first.id, owner.id, "   ", deps(true)), /bodyRequired/);
    assert.equal(sent.length, 0);

    // SMTP hatası → taslak korunur.
    await assert.rejects(() => drafts.sendReplyDraft(first.id, owner.id, "Merhaba", deps(false)), /sendFailed/);
    assert.equal((await drafts.readReplyDraft(first.id, owner.id)).status, "DRAFT");
    // 2. onay: gönder; ikinci gönderim olmaz; gövde silinir.
    await drafts.sendReplyDraft(first.id, owner.id, "Merhaba", deps(true));
    await assert.rejects(() => drafts.sendReplyDraft(first.id, owner.id, "Merhaba", deps(true)), /notEditable/);
    assert.deepEqual(sent, [message.fromAddress, message.fromAddress]);
    const stored = await db.mailReplyDraft.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(stored.status, "SENT");
    assert.equal(stored.bodyEnc, null);

    // Rıza geri alınınca açık taslaklar silinir.
    const message2 = await db.mailInboxMessage.create({ data: { source: "EML", externalKey: `${tag}:2`, subject: `${tag} Mitgliedschaft`, fromAddress: `s2-${tag}@example.test`, receivedAt: new Date() } });
    const draft2 = await drafts.createReplyDraft(message2.id, owner.id);
    await drafts.saveReplyDraftBody(draft2.id, owner.id, "Taslak metni");
    assert.notEqual((await db.mailReplyDraft.findUniqueOrThrow({ where: { id: draft2.id } })).bodyEnc, "Taslak metni", "gövde şifreli");
    await setTriageOptIn(owner.id, false);
    assert.equal(await db.mailReplyDraft.count({ where: { id: draft2.id } }), 0);
    assert.deepEqual(await collect(owner.id), [], "rıza geri alındı → öneri yok");
  } finally {
    await setTriageEnabled(before);
    await db.mailTriageOptIn.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
    await db.mailInboxMessage.deleteMany({ where: { externalKey: { startsWith: tag } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  }
});

test("db: görev taslağı yalnız onaylı eylemle ve bir kez", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `trt-${randomUUID().slice(0, 8)}`;
  const { setTriageOptIn } = await import("@/modules/mail/services/inbox-triage");
  const { taskDraftAction } = await import("@/modules/mail/secretary");
  const user = await db.user.create({ data: { name: tag, email: `u-${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const message = await db.mailInboxMessage.create({ data: { source: "EML", externalKey: `${tag}:1`, subject: `${tag} Einladung`, fromAddress: `s-${tag}@example.test`, receivedAt: new Date(), category: "meeting" } });
  const context = { user: { id: user.id, role: "ADMIN" as const }, now: new Date() };
  try {
    await assert.rejects(() => taskDraftAction.execute({ inboxMessageId: message.id }, context), /NOT_OPTED_IN/);
    await assert.rejects(() => taskDraftAction.execute({ inboxMessageId: message.id }, { ...context, user: { ...context.user, role: "VIEWER" } }), /FORBIDDEN/);
    await setTriageOptIn(user.id, true);
    await taskDraftAction.execute({ inboxMessageId: message.id }, context);
    await taskDraftAction.execute({ inboxMessageId: message.id }, context);
    const tasks = await db.task.findMany({ where: { title: `${tag} Einladung` } });
    assert.equal(tasks.length, 1, "aynı mesaj için tek görev");
    assert.equal(tasks[0].status, "OPEN");
    assert.equal(tasks[0].memberId, null, "atama yok");
    assert.equal(tasks[0].dueDate, null, "tarih yok");
  } finally {
    await db.task.deleteMany({ where: { title: { startsWith: tag } } });
    await db.mailTriageOptIn.deleteMany({ where: { userId: user.id } });
    await db.mailInboxMessage.deleteMany({ where: { externalKey: { startsWith: tag } } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
