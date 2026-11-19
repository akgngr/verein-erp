/**
 * S5.2 (#316) — dış kanallar: rıza + onay olmadan gönderim yok, rıza geri alma, kanal başına günlük sınır,
 * dış kanala kişisel veri yok, yapılandırma yoksa fail-closed. Gerçek sağlayıcı yok: sahte (mock) adaptörle sözleşme testi.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { channelDigestText } from "@/modules/secretary/services/channels";
import { getDb } from "@/shared/db";
import { disabledChannelAdapter, maskChannelAddress, normalizeChannelAddress, type SecretaryChannelAdapter, type SecretaryExternalChannel } from "@/shared/secretary/channels";

test("channels: adres doğrulama ve maskeleme", () => {
  assert.equal(normalizeChannelAddress("sms", "+49 151 2345 6789"), "+4915123456789");
  assert.equal(normalizeChannelAddress("whatsapp", "0151 2345678"), null, "ülke kodu zorunlu");
  assert.equal(normalizeChannelAddress("telegram", "123456789"), "123456789");
  assert.equal(normalizeChannelAddress("telegram", "@kullanici"), null);
  assert.equal(maskChannelAddress("+4915123456789").endsWith("789"), true);
  assert.ok(!maskChannelAddress("+4915123456789").includes("4915"));
});

test("channels: gövde yalnız sayılar; varsayılan adaptör kapalı (fail-closed)", async () => {
  const text = channelDigestText({ date: "2031-03-27", total: 4, danger: 1, warning: 2 }, "tr");
  assert.equal(text, "Verein ERP 2031-03-27: 4 kayıt (1 acil, 2 dikkat).");
  assert.match(channelDigestText({ date: "2031-03-27", total: -1, danger: Number.NaN, warning: 2.5 }, "de"), /: 0 Einträge \(0 dringend, 0 Achtung\)/);
  const adapter = disabledChannelAdapter("sms");
  assert.equal(await adapter.isConfigured(), false);
  assert.deepEqual(await adapter.send({ to: "+4915123456789", text: "x", reference: "r" }), { ok: false, errorCode: "CHANNEL_DISABLED" });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

function mockAdapters(options: { configured?: boolean; fail?: boolean } = {}) {
  const sent: { channel: string; to: string; text: string }[] = [];
  const resolver = (channel: SecretaryExternalChannel): SecretaryChannelAdapter => ({
    key: channel,
    isConfigured: async () => options.configured ?? true,
    send: async (message) => { sent.push({ channel, to: message.to, text: message.text }); return options.fail ? { ok: false, errorCode: "PROVIDER_DOWN" } : { ok: true, providerId: `p-${sent.length}` }; },
  });
  return { sent, resolver };
}

test("db: rıza + doğrulama olmadan teslim yok; geri alma anında durdurur; günlük tek teslim; yapılandırma yoksa hiçbir şey saklanmaz", { skip: !enabled }, async () => {
  const db = getDb();
  const svc = await import("@/modules/secretary/services/channels");
  const tag = `ch-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const actor = { id: user.id, role: "ADMIN" as const, isActive: true };
  const digest = { date: "2031-03-27", total: 3, danger: 1, warning: 1 };
  const now = new Date("2031-03-27T08:00:00Z");
  try {
    // Sağlayıcı yok → reddedilir, kayıt yok.
    await assert.rejects(() => svc.requestConsent(actor, "sms", "+4915123456789", svc.defaultAdapters, now), /unavailable/);
    assert.equal(await db.secretaryChannelConsent.count({ where: { userId: user.id } }), 0);

    // Rıza bekliyor (doğrulanmadı) → teslim yok.
    const mock = mockAdapters();
    await svc.requestConsent(actor, "sms", "+4915123456789", mock.resolver, now);
    const code = /(\d{6})$/.exec(mock.sent[0].text)?.[1];
    assert.ok(code);
    assert.equal(await svc.deliverDigestToChannel(actor, "sms", digest, { locale: "tr", adapters: mock.resolver }, now), "skipped");
    assert.equal(mock.sent.length, 1, "yalnız doğrulama kodu gitti");
    const stored = await db.secretaryChannelConsent.findFirstOrThrow({ where: { userId: user.id } });
    assert.ok(!stored.addressEnc?.includes("4915123456789") && stored.codeHash !== code, "adres şifreli, kod hash");

    // Hatalı kod; sonra doğru kod.
    await assert.rejects(() => svc.confirmConsent(user.id, "sms", code === "000000" ? "111111" : "000000", now), /codeInvalid/);
    await svc.confirmConsent(user.id, "sms", code!, now);
    assert.deepEqual(await svc.activeChannels(user.id), ["sms"]);

    // Teslim: yalnız sayılar; aynı gün ikinci kez yok (yeniden başlatma/çift çalışma).
    const results = await Promise.all([1, 2, 3].map(() => svc.deliverDigestToChannel(actor, "sms", digest, { locale: "tr", adapters: mock.resolver }, now)));
    assert.deepEqual(results.filter((r) => r === "sent"), ["sent"]);
    const dailies = mock.sent.filter((m) => !/\d{6}$/.test(m.text));
    assert.equal(dailies.length, 1);
    assert.ok(!dailies[0].text.includes(tag) && !dailies[0].text.includes("@"), "kişisel veri yok");

    // Yetkisiz/pasif kullanıcıya gönderim yok.
    assert.equal(await svc.deliverDigestToChannel({ ...actor, role: "VIEWER" as never }, "sms", { ...digest, date: "2031-03-28" }, { locale: "tr", adapters: mock.resolver }, now), "skipped");
    assert.equal(await svc.deliverDigestToChannel({ ...actor, isActive: false }, "sms", { ...digest, date: "2031-03-28" }, { locale: "tr", adapters: mock.resolver }, now), "skipped");
    // Sessiz saat.
    assert.equal(await svc.deliverDigestToChannel(actor, "sms", { ...digest, date: "2031-03-28" }, { locale: "tr", adapters: mock.resolver, quiet: { quietFrom: "08:00", quietTo: "12:00" } }, now), "skipped");

    // Sağlayıcı hatası: sınırlı yeniden deneme, sonra durur.
    const failing = mockAdapters({ fail: true });
    for (let i = 0; i < 5; i += 1) await svc.deliverDigestToChannel(actor, "sms", { ...digest, date: "2031-03-29" }, { locale: "tr", adapters: failing.resolver }, now).catch(() => undefined);
    assert.equal(failing.sent.length, svc.CHANNEL_LIMITS.deliveryAttempts);

    // Rıza geri alma: adres silinir, teslim durur.
    await svc.revokeConsent(user.id, "sms");
    assert.equal((await db.secretaryChannelConsent.findFirstOrThrow({ where: { userId: user.id } })).addressEnc, null);
    assert.equal(await svc.deliverDigestToChannel(actor, "sms", { ...digest, date: "2031-03-30" }, { locale: "tr", adapters: mock.resolver }, now), "skipped");
    assert.deepEqual(await svc.activeChannels(user.id), []);

    // Doğrulama gönderimi günlük sınırlı.
    const limited = mockAdapters();
    for (let i = 0; i < svc.CHANNEL_LIMITS.verificationsPerDay; i += 1) await svc.requestConsent(actor, "telegram", "123456789", limited.resolver, now);
    await assert.rejects(() => svc.requestConsent(actor, "telegram", "123456789", limited.resolver, now), /rateLimited/);
  } finally {
    await db.secretaryChannelDelivery.deleteMany({ where: { userId: user.id } });
    await db.secretaryChannelConsent.deleteMany({ where: { userId: user.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
