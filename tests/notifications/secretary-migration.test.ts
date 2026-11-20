/**
 * N6 (#363) — sekreter özeti merkezi bildirim sistemine yayımlanır; dış metin yalnız sayı; geçiş idempotent ve
 * kullanıcının bildirim kararını ezmez.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { notifications as secretaryNotifications } from "@/modules/secretary/notifications";
import { runDailyBriefings, type ScheduledPreference } from "@/modules/secretary/services/daily-briefing";
import { getDb } from "@/shared/db";
import { safeExternalText } from "@/shared/notifications/define";
import { sealSecret } from "@/shared/security/secret-box";

test("dış metin: tek satır, kontrol karakteri yok, 160 sınırı", () => {
  assert.equal(safeExternalText("a\nb\u0007c"), "a b c");
  assert.equal(safeExternalText("x".repeat(500))?.length, 160);
  assert.equal(safeExternalText(42), null);
  assert.equal(safeExternalText("   "), null);
});

test("günlük özet türü: dış metin yalnız sayı ve tarih", () => {
  const type = secretaryNotifications.types.find((t) => t.key === "daily-digest")!;
  const params = { date: "2031-03-27", total: 12, danger: 2, warning: 3 };
  assert.ok(type.schema.safeParse(params).success);
  assert.equal(type.schema.safeParse({ ...params, name: "Ali" }).success, false);
  assert.equal(type.externalText!(params, "tr"), "Günlük özet 2031-03-27: 12 kayıt (2 acil, 3 dikkat)");
});

test("runner: özet bir kez yayımlanır; boş özet yayımlanmaz; kanal listesinden bağımsız", async () => {
  const published: string[] = [];
  const pref = (userId: string): ScheduledPreference => ({ userId, briefingEnabled: true, briefingTime: "07:00", quietFrom: null, quietTo: null, lastBriefingOn: null, channels: ["in_app"] });
  const claimed = new Set<string>();
  const run = (count: number) => runDailyBriefings(new Date("2031-03-27T08:00:00Z"), {
    listPreferences: async () => [pref("u1")],
    claim: async (userId, date) => (claimed.has(`${userId}:${date}`) ? false : (claimed.add(`${userId}:${date}`), true)),
    loadUser: async (id) => ({ id, role: "ADMIN", isActive: true }),
    buildBriefing: async () => ({ generatedAt: "x", failures: [], sections: count ? [{ module: "tasks", items: Array.from({ length: count }, (_, i) => ({ id: `tasks:x:${i}`, module: "tasks", kind: "x", severity: "danger" as const, title: "x", href: "/tasks" })) }] : [] }),
    publish: async (user, digest) => { published.push(`${user.id}:${digest.total}:${digest.danger}`); },
  });
  await run(0);
  assert.deepEqual(published, []);
  claimed.clear();
  await run(2);
  await run(2);
  assert.deepEqual(published, ["u1:2:2"], "günde bir; yalnız in_app seçili olsa da yayımlanır");
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: geçiş idempotent, mevcut kararı ezmez, rızayı bağ olarak alır", { skip: !enabled }, async () => {
  const db = getDb();
  const { migrateSecretaryToNotifications } = await import("@/modules/secretary/services/notification-migration");
  const tag = `mg-${randomUUID().slice(0, 8)}`;
  const mk = () => db.user.create({ data: { name: tag, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const [a, b] = await Promise.all([mk(), mk()]);
  try {
    await db.secretaryPreference.createMany({ data: [{ userId: a.id, channels: ["in_app", "email"] }, { userId: b.id, channels: ["email"] }] });
    // b daha önce bildirim sisteminde e-postayı kapatmış: ezilmemeli.
    await db.notificationPreference.create({ data: { userId: b.id, typeKey: "secretary.daily-digest", channel: "email", enabled: false } });
    await db.secretaryChannelConsent.create({ data: { userId: a.id, channel: "telegram", addressEnc: sealSecret("secretary-channel", "777000"), verifiedAt: new Date() } });

    await migrateSecretaryToNotifications();
    await migrateSecretaryToNotifications();
    assert.equal((await db.notificationPreference.findFirstOrThrow({ where: { userId: a.id, typeKey: "secretary.daily-digest", channel: "email" } })).enabled, true);
    assert.equal((await db.notificationPreference.findFirstOrThrow({ where: { userId: b.id, typeKey: "secretary.daily-digest", channel: "email" } })).enabled, false, "kullanıcı kararı korunur");
    assert.equal(await db.notificationPreference.count({ where: { userId: a.id } }), 1, "tekrar çalışma çoğaltmaz");
    const { telegramChatFor } = await import("@/modules/notifications/services/telegram");
    assert.equal(await telegramChatFor(a.id), "777000");
    assert.equal(await db.notificationChannelLink.count({ where: { userId: a.id } }), 1);
  } finally {
    await db.notificationChannelLink.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.secretaryChannelConsent.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.secretaryPreference.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  }
});
