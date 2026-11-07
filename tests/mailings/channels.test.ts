import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { moduleChannelRegistry } from "@/campaign-channel-registry";
import { channelFetch, normalizePhone, splitForChannel } from "@/shared/campaigns/channel";
import type { Recipient } from "@/shared/mailings/define";

const channel = (key: string) => moduleChannelRegistry.flatMap((entry) => entry.channels).find((item) => item.key === key)!;
const person = (overrides: Partial<Recipient>): Recipient => ({ id: "1", email: null, name: "A", optOut: false, vars: {}, ...overrides });

describe("Campaign channels", () => {
  test("registry: email built in, sms/telegram/whatsapp plugins, unique keys", () => {
    const keys = moduleChannelRegistry.flatMap((entry) => entry.channels.map((item) => item.key)).sort();
    assert.deepEqual(keys, ["email", "sms", "telegram", "whatsapp"]);
  });

  test("phone numbers are normalised to E.164", () => {
    assert.equal(normalizePhone("0151 234 567 89"), "+4915123456789");
    assert.equal(normalizePhone("0049 151 23456789"), "+4915123456789");
    assert.equal(normalizePhone("+90 532 123 45 67"), "+905321234567");
    assert.equal(normalizePhone("0532 123 45 67", "90"), "+905321234567");
    assert.equal(normalizePhone("123"), null);
    assert.equal(normalizePhone(null), null);
  });

  test("SMS and WhatsApp require explicit consent; email respects opt-out", () => {
    const list = [
      person({ id: "a", phone: "+4915123456789", consents: { sms: true } }),
      person({ id: "b", phone: "+4915123456780" }),
      person({ id: "c", phone: null, consents: { sms: true, whatsapp: true } }),
      person({ id: "d", phone: "+4915123456781", consents: { whatsapp: true } }),
    ];
    assert.deepEqual(splitForChannel(channel("sms"), list).eligible.map((row) => row.id), ["a"]);
    assert.deepEqual(splitForChannel(channel("whatsapp"), list).eligible.map((row) => row.id), ["d"]);
    const email = splitForChannel(channel("email"), [person({ id: "x", email: "x@example.test" }), person({ id: "y", email: "y@example.test", optOut: true }), person({ id: "z" })]);
    assert.deepEqual(email.eligible.map((row) => row.id), ["x"]);
    assert.equal(email.optOut, 1);
    assert.equal(email.noAddress, 1);
  });

  test("Telegram only reaches subscribers and honours an explicit refusal", () => {
    const list = [
      person({ id: "a", telegramChatId: "111" }),
      person({ id: "b" }),
      person({ id: "c", telegramChatId: "333", consents: { telegram: false } }),
    ];
    assert.deepEqual(splitForChannel(channel("telegram"), list).eligible.map((row) => row.id), ["a"]);
  });

  test("channels validate their settings before sending", async () => {
    assert.equal(await channel("sms").isConfigured({ provider: "seven" }), false);
    assert.equal(await channel("sms").isConfigured({ provider: "seven", apiKey: "k" }), true);
    assert.equal(await channel("sms").isConfigured({ provider: "twilio", apiKey: "k" }), false);
    assert.equal(await channel("whatsapp").isConfigured({ phoneNumberId: "12345678", accessToken: "t", templateName: "news" }), true);
    assert.equal(await channel("telegram").isConfigured({ botToken: "bad", botUsername: "bot" }), false);
  });

  test("provider calls are https and host-allowlisted", async () => {
    await assert.rejects(channelFetch(["seven.io"], "https://evil.example.com/api"), /CHANNEL_HOST_NOT_ALLOWED/);
    await assert.rejects(channelFetch(["seven.io"], "http://gateway.seven.io/api"), /CHANNEL_HOST_NOT_ALLOWED/);
  });
});
