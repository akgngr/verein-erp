/**
 * N2a (#357) — tercihler + e-posta dağıtımı: çift gönderim yok (yeniden başlatma/paralel), sessiz saat, okunan
 * bildirim gitmez, günlük özet günde bir, pasif/yetkisiz kullanıcıya yok, e-postada kişisel veri yok.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { z } from "zod";

import { emailText, isQuiet, type DispatchDeps, type MailMessage } from "@/modules/notifications/services/dispatch";
import { resolveChannels, settingsInputSchema } from "@/modules/notifications/services/preferences";
import { getDb } from "@/shared/db";
import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";
import { definePermissions } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

const perms = definePermissions("demo", { ADMIN: ["view"], BOARD: ["view"], SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] });
const withEmail = defineNotificationType({ key: "invited", severity: "info", defaultChannels: ["in_app", "email"], permission: { definition: perms, action: "view" }, schema: z.object({ id: z.string(), title: z.string() }).strict(), titleKey: "notifications.invited.title", href: (p) => `/toplantilar/${p.id}` });
const inAppOnly = defineNotificationType({ ...withEmail, key: "quiet", defaultChannels: ["in_app"] } as never);
const registry = [defineNotificationTypes("meetings", [withEmail, inAppOnly])];

test("tercih çözümü: tür satırı > '*' satırı > varsayılan; uygulama içi tercih dışı", () => {
  assert.deepEqual(resolveChannels(withEmail, "meetings.invited", []), ["email"]);
  assert.deepEqual(resolveChannels(withEmail, "meetings.invited", [{ typeKey: "*", channel: "email", enabled: false }]), []);
  assert.deepEqual(resolveChannels(withEmail, "meetings.invited", [{ typeKey: "*", channel: "email", enabled: false }, { typeKey: "meetings.invited", channel: "email", enabled: true }]), ["email"]);
  assert.deepEqual(resolveChannels(inAppOnly, "meetings.quiet", [{ typeKey: "*", channel: "telegram", enabled: true }]), ["telegram"]);
  assert.equal(settingsInputSchema.safeParse({ quietFrom: "22:00", quietTo: null, digestMode: "instant", digestTime: "07:30" }).success, false);
  assert.equal(isQuiet(23 * 60, "22:00", "07:00"), true);
  assert.equal(isQuiet(8 * 60, "22:00", "07:00"), false);
});

test("e-posta metni yalnız sayı ve bağlantı", () => {
  const mail = emailText("tr", 3, "https://erp.example.test/");
  assert.match(mail.subject, /3 yeni bildirim/);
  assert.ok(mail.text.endsWith("https://erp.example.test/"));
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: anında/özet dağıtımı, idempotensi, sessiz saat, okunan/yetkisiz/pasif", { skip: !enabled }, async () => {
  const db = getDb();
  const { runDispatch } = await import("@/modules/notifications/services/dispatch");
  const { notify } = await import("@/modules/notifications/services/inbox");
  const tag = `nd-${randomUUID().slice(0, 8)}`;
  const mk = (role: Role) => db.user.create({ data: { name: tag, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role, isActive: true } });
  const a = await mk("ADMIN");
  const b = await mk("BOARD");
  const users = new Map([a, b].map((u) => [u.id, { id: u.id, role: u.role as Role, isActive: true, email: u.email }]));
  const sent: MailMessage[] = [];
  const deps: DispatchDeps = {
    registry, usableModules: async () => ["meetings"], loadUser: async (id) => users.get(id) ?? null,
    isMailConfigured: async () => true, sendMail: async (m) => { sent.push(m); return { ok: true, logId: "l" }; },
    appUrl: "https://erp.example.test", locale: "tr",
  };
  const notifyDeps = { registry, usableModules: deps.usableModules, loadUser: async (id: string) => users.get(id) ?? null };
  const morning = new Date("2031-03-27T09:00:00Z"); // 10:00 Berlin
  try {
    await notify({ type: "meetings.invited", recipients: [a.id, b.id], ref: `${tag}:1`, params: { id: "m1", title: "Gizli Toplantı Adı" } }, notifyDeps);
    await notify({ type: "meetings.quiet", recipients: [a.id], ref: `${tag}:2`, params: { id: "m2", title: "x" } }, notifyDeps);
    await db.notification.updateMany({ where: { userId: { in: [a.id, b.id] } }, data: { createdAt: new Date(morning.getTime() - 60_000) } });

    // b: sessiz saat; a: anında.
    await db.notificationSettings.create({ data: { userId: b.id, quietFrom: "09:00", quietTo: "12:00" } });
    await Promise.all([runDispatch(morning, deps), runDispatch(morning, deps), runDispatch(morning, deps)]);
    assert.equal(sent.filter((m) => m.to === users.get(a.id)!.email).length, 1, "a'ya tek e-posta (uygulama içi tür e-postalanmaz)");
    assert.equal(sent.filter((m) => m.to === users.get(b.id)!.email).length, 0, "sessiz saat");
    assert.ok(sent.every((m) => !m.text.includes("Gizli") && !m.subject.includes("Gizli")), "başlık/parametre yok");
    assert.ok(sent[0].text.includes("https://erp.example.test/toplantilar/m1"));

    // Sessiz saat bitince b'ye gider; okunduysa gitmez.
    const later = new Date("2031-03-27T12:30:00Z");
    await runDispatch(later, deps);
    assert.equal(sent.filter((m) => m.to === users.get(b.id)!.email).length, 1);
    await notify({ type: "meetings.invited", recipients: [b.id], ref: `${tag}:3`, params: { id: "m3", title: "x" } }, notifyDeps);
    await db.notification.updateMany({ where: { userId: b.id, refKey: `${tag}:3` }, data: { readAt: later } });
    await runDispatch(later, deps);
    assert.equal(sent.filter((m) => m.to === users.get(b.id)!.email).length, 1, "okunan e-postalanmaz");

    // Tercih: e-posta kapalı → yok. Yetkisi düşen → yok.
    await db.notificationPreference.create({ data: { userId: a.id, typeKey: "*", channel: "email", enabled: false } });
    await notify({ type: "meetings.invited", recipients: [a.id], ref: `${tag}:4`, params: { id: "m4", title: "x" } }, notifyDeps);
    await runDispatch(later, deps);
    assert.equal(sent.filter((m) => m.to === users.get(a.id)!.email).length, 1);
    await db.notificationPreference.deleteMany({ where: { userId: a.id } });
    users.set(a.id, { ...users.get(a.id)!, role: "VIEWER" });
    await runDispatch(later, deps);
    assert.equal(sent.filter((m) => m.to === users.get(a.id)!.email).length, 1, "yetkisiz rol");
    users.set(a.id, { ...users.get(a.id)!, role: "ADMIN" });

    // Günlük özet: saatinden önce yok, sonra günde bir.
    await db.notificationSettings.create({ data: { userId: a.id, digestMode: "daily", digestTime: "18:00" } });
    await notify({ type: "meetings.invited", recipients: [a.id], ref: `${tag}:5`, params: { id: "m5", title: "x" } }, notifyDeps);
    const before = sent.length;
    await runDispatch(later, deps);
    assert.equal(sent.length, before, "özet saatinden önce yok");
    const evening = new Date("2031-03-27T17:30:00Z"); // 18:30 Berlin
    await runDispatch(evening, deps);
    await runDispatch(evening, deps);
    const digests = sent.slice(before).filter((m) => m.to === users.get(a.id)!.email);
    assert.equal(digests.length, 1, "günde tek özet");
    assert.match(digests[0].subject, /yeni bildirim/);

    // Mail yapılandırılmamış veya APP_URL yoksa hiçbir şey gitmez.
    const count = sent.length;
    await runDispatch(evening, { ...deps, isMailConfigured: async () => false });
    await runDispatch(evening, { ...deps, appUrl: undefined });
    assert.equal(sent.length, count);
  } finally {
    await db.notificationDelivery.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.notificationSettings.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.notification.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  }
});
