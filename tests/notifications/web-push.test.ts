/**
 * N3a (#359) — Web Push: VAPID otomatik ve şifreli, yalnız bilinen push servisleri (SSRF önlemi), abonelik
 * temizliği (404/410), dağıtımda genel metin ve çift gönderim yok. Gerçek push servisi yok: sahte taşıyıcı.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { isAllowedPushEndpoint, subscriptionSchema } from "@/modules/notifications/services/web-push";
import { getDb } from "@/shared/db";

const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

test("uç nokta yalnız bilinen push servisleri (https)", () => {
  for (const ok of ["https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://web.push.apple.com/Q", "https://db5p.notify.windows.com/w/?token=x"]) assert.equal(isAllowedPushEndpoint(ok), true, ok);
  for (const bad of ["http://fcm.googleapis.com/x", "https://evil.test/x", "https://fcm.googleapis.com.evil.test/x", "https://user:pw@fcm.googleapis.com/x", "https://169.254.169.254/latest"]) assert.equal(isAllowedPushEndpoint(bad), false, bad);
  assert.equal(subscriptionSchema.safeParse({ endpoint: "https://evil.test/x", keys }).success, false);
  assert.equal(subscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys, extra: 1 }).success, false);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: VAPID üretimi, abonelik, gönderim, 410 temizliği", { skip: !enabled }, async () => {
  const db = getDb();
  const wp = await import("@/modules/notifications/services/web-push");
  const tag = `wp-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "web_push" } });
  await db.notificationChannelConfig.deleteMany({ where: { channel: "web_push" } });
  try {
    await assert.rejects(() => wp.subscribe(user.id, { endpoint: "https://fcm.googleapis.com/a", keys }), /unavailable/, "kanal kapalıyken abonelik yok");
    await assert.rejects(() => wp.configureWebPush(true, "http://erp.example.test", user.id), /appUrl/);
    let generated = 0;
    const gen = () => { generated += 1; return { publicKey: `PUB-${generated}`, privateKey: `PRIV-SECRET-${generated}` }; };
    assert.deepEqual(await wp.configureWebPush(true, "https://erp.example.test", user.id, gen), { publicKey: "PUB-1" });
    assert.deepEqual(await wp.configureWebPush(true, "https://erp.example.test", user.id, gen), { publicKey: "PUB-1" }, "anahtar yeniden üretilmez");
    const stored = await db.notificationChannelConfig.findUniqueOrThrow({ where: { channel: "web_push" } });
    assert.ok(stored.secretsEnc && !stored.secretsEnc.includes("PRIV-SECRET"), "özel anahtar şifreli");

    await wp.subscribe(user.id, { endpoint: "https://fcm.googleapis.com/a", keys });
    await wp.subscribe(user.id, { endpoint: "https://web.push.apple.com/b", keys });
    await wp.subscribe(user.id, { endpoint: "https://fcm.googleapis.com/a", keys });
    assert.equal(await db.notificationPushSubscription.count({ where: { userId: user.id } }), 2, "aynı uç nokta tek kayıt");
    const row = await db.notificationPushSubscription.findFirstOrThrow({ where: { userId: user.id } });
    assert.ok(!row.endpointEnc.includes("fcm.googleapis.com"), "uç nokta şifreli");

    const calls: { endpoint: string; payload: string; options: Record<string, unknown> }[] = [];
    const transport = async (sub: { endpoint: string }, payload: string, options: Record<string, unknown>) => {
      calls.push({ endpoint: sub.endpoint, payload, options });
      if (sub.endpoint.includes("apple")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return { statusCode: 201 };
    };
    const result = await wp.sendPush(user.id, { title: "Verein ERP: yeni bildirim", body: "x", url: "https://erp.example.test/" }, transport);
    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 2);
    assert.equal((calls[0].options.vapidDetails as { privateKey: string }).privateKey, "PRIV-SECRET-1");
    assert.equal(await db.notificationPushSubscription.count({ where: { userId: user.id } }), 1, "410 → abonelik silindi");

    await wp.unsubscribe(user.id, "https://fcm.googleapis.com/a");
    assert.equal(await wp.sendPush(user.id, { title: "x", body: "x", url: "https://erp.example.test/" }, transport), null, "abonelik yok");
  } finally {
    await db.notificationPushSubscription.deleteMany({ where: { userId: user.id } });
    await db.notificationChannelConfig.deleteMany({ where: { channel: "web_push" } });
    if (before) await db.notificationChannelConfig.create({ data: { channel: before.channel, enabled: before.enabled, secretsEnc: before.secretsEnc, settings: before.settings ?? undefined } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
