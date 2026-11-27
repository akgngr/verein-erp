/** #604: channel settings UI contract, WhatsApp number verification (authentication template), availability. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { describe } from "node:test";

import { getDb } from "@/shared/db";

describe("whatsapp linking (pure)", () => {
  test("verification uses the authentication template: code in body and copy-code button, no other data", async () => {
    const { buildVerificationPayload } = await import("@/modules/notifications/services/whatsapp-link");
    const payload = buildVerificationPayload({ verifyTemplateName: "verein_code", templateLanguage: "de" }, "+4915112345678", "123456");
    assert.equal(payload.to, "4915112345678");
    assert.equal(payload.template.name, "verein_code");
    assert.deepEqual(payload.template.components, [
      { type: "body", parameters: [{ type: "text", text: "123456" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "123456" }] },
    ]);
  });

  test("linking needs the ready channel plus an authentication template (fail closed)", async () => {
    const { whatsappLinkingReady } = await import("@/modules/notifications/services/whatsapp-link");
    const ready = { enabled: true, secrets: { accessToken: "t" }, settings: { phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de", templateApproved: "true" } };
    assert.equal(whatsappLinkingReady(ready), false, "no verification template");
    assert.equal(whatsappLinkingReady({ ...ready, settings: { ...ready.settings, verifyTemplateName: "verein_code" } }), true);
    assert.equal(whatsappLinkingReady({ ...ready, settings: { ...ready.settings, verifyTemplateName: "verein_code", templateApproved: "false" } }), false);
  });

  test("UI: secrets are write-only, unavailable channels are hidden", () => {
    const admin = fs.readFileSync("src/modules/notifications/components/channel-admin.tsx", "utf8");
    assert.match(admin, /type="password" autoComplete="new-password"/);
    assert.doesNotMatch(admin, /secrets\.(apiKey|accessToken)/, "client never reads secret values");
    const form = fs.readFileSync("src/modules/notifications/components/preferences-form.tsx", "utf8");
    assert.match(form, /CHANNELS\.filter\(\(channel\) => available\[channel\]\)/);
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: WhatsApp code flow — unavailable until configured, hashed code, wrong code counted, masked status, revoke", { skip: !enabled }, async () => {
  const { configureWhatsapp } = await import("@/modules/notifications/services/whatsapp");
  const { requestWhatsappVerification, confirmWhatsappVerification, phoneLinkStatus, revokeWhatsapp } = await import("@/modules/notifications/services/whatsapp-link");
  const db = getDb();
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "whatsapp" } });
  const userId = `wa-link-${randomUUID()}`;
  type Sent = { body: { template: { components: Array<{ parameters: Array<{ text: string }> }> } } };
  const sent: Sent[] = [];
  const transport = async (input: { body: unknown }) => { sent.push(input as Sent); return { ok: true }; };
  try {
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    await assert.rejects(requestWhatsappVerification(userId, "+49 151 12345678", transport), /unavailable/);
    await configureWhatsapp({ enabled: true, accessToken: "EAAG-test", phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de", templateApproved: true }, "admin");
    await assert.rejects(requestWhatsappVerification(userId, "+49 151 12345678", transport), /unavailable/, "no authentication template yet");
    await configureWhatsapp({ enabled: true, verifyTemplateName: "verein_code" }, "admin");

    await requestWhatsappVerification(userId, "+49 151 12345678", transport);
    const code = sent[0]!.body.template.components[0]!.parameters[0]!.text;
    assert.match(code, /^\d{6}$/);
    const row = await db.notificationChannelLink.findUniqueOrThrow({ where: { userId_channel: { userId, channel: "whatsapp" } } });
    assert.notEqual(row.linkTokenHash, code, "code stored as hash only");
    assert.deepEqual(await phoneLinkStatus(userId, "whatsapp"), { status: "pending", masked: "••• 678" });

    const wrong = code === "000000" ? "111111" : "000000";
    await assert.rejects(confirmWhatsappVerification(userId, wrong), /codeInvalid/);
    await confirmWhatsappVerification(userId, code);
    assert.deepEqual(await phoneLinkStatus(userId, "whatsapp"), { status: "linked", masked: "••• 678" });

    await revokeWhatsapp(userId);
    assert.deepEqual(await phoneLinkStatus(userId, "whatsapp"), { status: "none", masked: null });
  } finally {
    await db.notificationDelivery.deleteMany({ where: { userId } });
    await db.notificationChannelLink.deleteMany({ where: { userId } });
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    if (before) await db.notificationChannelConfig.create({ data: before as never });
  }
});

test("db: confirmation only verifies the number the code was sent to (request/confirm race)", { skip: !enabled }, async () => {
  const { configureWhatsapp } = await import("@/modules/notifications/services/whatsapp");
  const { requestWhatsappVerification, confirmWhatsappVerification, phoneLinkStatus } = await import("@/modules/notifications/services/whatsapp-link");
  const db = getDb();
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "whatsapp" } });
  const userId = `wa-race-${randomUUID()}`;
  type Sent = { body: { template: { components: Array<{ parameters: Array<{ text: string }> }> } } };
  const sent: Sent[] = [];
  const transport = async (input: { body: unknown }) => { sent.push(input as Sent); return { ok: true }; };
  try {
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    await configureWhatsapp({ enabled: true, accessToken: "EAAG-test", phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de", templateApproved: true, verifyTemplateName: "verein_code" }, "admin");
    await requestWhatsappVerification(userId, "+49 151 11111111", transport);
    const ownCode = sent[0]!.body.template.components[0]!.parameters[0]!.text;
    // Simulate the race: between the code check and the update, the row is switched to another number and code.
    const original = db.notificationChannelLink.findUnique.bind(db.notificationChannelLink);
    const row = await original({ where: { userId_channel: { userId, channel: "whatsapp" } } });
    await requestWhatsappVerification(userId, "+49 151 22222222", transport);
    const swapped = db.notificationChannelLink as unknown as { findUnique: (args: unknown) => Promise<unknown> };
    swapped.findUnique = async () => row;
    try {
      await assert.rejects(confirmWhatsappVerification(userId, ownCode), /codeExpired/);
    } finally {
      swapped.findUnique = original as never;
    }
    assert.equal((await phoneLinkStatus(userId, "whatsapp")).status, "pending", "the replacement number stays unverified");
  } finally {
    await db.notificationDelivery.deleteMany({ where: { userId } });
    await db.notificationChannelLink.deleteMany({ where: { userId } });
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    if (before) await db.notificationChannelConfig.create({ data: before as never });
  }
});
