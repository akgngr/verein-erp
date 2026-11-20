/**
 * N6b (#363) — SMS: varsayılan kapalı, kodla doğrulama (hash, süre, deneme sınırı), genel metin; iş akışı düğümü.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { sendNotificationTask } from "@/modules/notifications/automation";
import { getDb } from "@/shared/db";

test("iş akışı düğümü: girdi şeması sıkı; varsayılan herkes", () => {
  assert.ok(sendNotificationTask.inputSchema.safeParse({ title: "Genel kurul", body: "", roles: [] }).success);
  assert.equal(sendNotificationTask.inputSchema.safeParse({ title: "", body: "" }).success, false);
  assert.equal(sendNotificationTask.inputSchema.safeParse({ title: "x", recipients: ["u1"] }).success, false, "tek tek alıcı yok (kitle)");
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: SMS kapalıyken hiçbir şey; doğrulama ve gönderim", { skip: !enabled }, async () => {
  const db = getDb();
  const sms = await import("@/modules/notifications/services/sms");
  const tag = `sm-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "sms" } });
  await db.notificationChannelConfig.deleteMany({ where: { channel: "sms" } });
  const sent: { to: string; text: string }[] = [];
  const transport: import("@/modules/notifications/services/sms").SmsTransport = async (i) => { sent.push({ to: i.to, text: i.text }); return { ok: true, providerId: "p" }; };
  try {
    await assert.rejects(() => sms.requestSmsVerification(user.id, "+49 151 2345 6789", transport), /unavailable/);
    assert.equal(await db.notificationChannelLink.count({ where: { userId: user.id } }), 0, "kapalıyken kayıt yok");
    await assert.rejects(() => sms.configureSms({ enabled: true, provider: "twilio", apiKey: "k" }, user.id), /smsProvider/, "Twilio SID zorunlu");
    await sms.configureSms({ enabled: true, provider: "seven", apiKey: "SECRET-KEY-123", sender: "Verein" }, user.id);
    const stored = await db.notificationChannelConfig.findUniqueOrThrow({ where: { channel: "sms" } });
    assert.ok(stored.secretsEnc && !stored.secretsEnc.includes("SECRET-KEY"), "anahtar şifreli");

    await assert.rejects(() => sms.requestSmsVerification(user.id, "12", transport), /phoneInvalid/);
    await sms.requestSmsVerification(user.id, "+49 151 2345 6789", transport);
    const code = /(\d{6})$/.exec(sent.at(-1)!.text)![1];
    const link = await db.notificationChannelLink.findFirstOrThrow({ where: { userId: user.id, channel: "sms" } });
    assert.ok(link.addressEnc && !link.addressEnc.includes("4915"), "numara şifreli");
    assert.equal(await sms.sendSms(user.id, "x", transport), null, "doğrulanmadan gönderim yok");
    await assert.rejects(() => sms.confirmSmsVerification(user.id, code === "000000" ? "111111" : "000000"), /codeInvalid/);
    await sms.confirmSmsVerification(user.id, code);
    assert.equal(await sms.smsNumberFor(user.id), "+4915123456789");
    assert.deepEqual(await sms.sendSms(user.id, "Verein ERP: yeni bildirim", transport), { ok: true, providerId: "p" });

    await sms.revokeSms(user.id);
    assert.equal(await sms.sendSms(user.id, "x", transport), null);
    for (let i = 0; i < 2; i += 1) await sms.requestSmsVerification(user.id, "+4915123456789", transport);
    await assert.rejects(() => sms.requestSmsVerification(user.id, "+4915123456789", transport), /rateLimited/, "günde 3 kod");
  } finally {
    await db.notificationDelivery.deleteMany({ where: { userId: user.id } });
    await db.notificationChannelLink.deleteMany({ where: { userId: user.id } });
    await db.notificationChannelConfig.deleteMany({ where: { channel: "sms" } });
    if (before) await db.notificationChannelConfig.create({ data: { channel: before.channel, enabled: before.enabled, secretsEnc: before.secretsEnc, settings: before.settings ?? undefined } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
