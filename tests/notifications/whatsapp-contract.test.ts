/** N5 (#362): fail-closed WhatsApp Cloud API adapter, mock transport only (no network). */
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import test, { describe } from "node:test";

import { buildTemplatePayload, whatsappReady } from "@/modules/notifications/services/whatsapp";
import { getDb } from "@/shared/db";
import { sealSecret } from "@/shared/security/secret-box";

const ready = { enabled: true, secrets: { accessToken: "EAAG-test" }, settings: { phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de", templateApproved: "true" } };

describe("whatsapp (pure)", () => {
  test("fail closed: every prerequisite is required, incl. the Meta template approval confirmation", () => {
    assert.equal(whatsappReady(ready), true);
    assert.equal(whatsappReady({ ...ready, enabled: false }), false);
    assert.equal(whatsappReady({ ...ready, secrets: {} }), false);
    assert.equal(whatsappReady({ ...ready, settings: { ...ready.settings, templateApproved: "false" } }), false);
    assert.equal(whatsappReady({ ...ready, settings: { ...ready.settings, templateApproved: undefined } as never }), false);
    assert.equal(whatsappReady({ ...ready, settings: { ...ready.settings, phoneNumberId: "abc" } }), false);
    assert.equal(whatsappReady({ ...ready, settings: { ...ready.settings, templateName: "Bad Name" } }), false);
  });

  test("payload: approved template with only count and app link (no names, titles, amounts)", () => {
    const body = buildTemplatePayload({ templateName: "verein_notification", templateLanguage: "de" }, { to: "+4915112345678", count: 3, link: "https://erp.example.de/notifications" });
    assert.deepEqual(body, {
      messaging_product: "whatsapp", to: "4915112345678", type: "template",
      template: { name: "verein_notification", language: { code: "de" }, components: [{ type: "body", parameters: [{ type: "text", text: "3" }, { type: "text", text: "https://erp.example.de/notifications" }] }] },
    });
    assert.equal(buildTemplatePayload({ templateName: "t", templateLanguage: "tr" }, { to: "491", count: -5, link: "x" }).template.components[0].parameters[0].text, "1");
  });

  test("transport only reaches graph.facebook.com via channelFetch", () => {
    const source = fs.readFileSync("src/modules/notifications/services/whatsapp.ts", "utf8");
    assert.match(source, /channelFetch\(\[WHATSAPP_HOST\]/);
    assert.match(source, /WHATSAPP_HOST = "graph\.facebook\.com"/);
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: sendWhatsapp is null until configured+approved and the user has a verified link", { skip: !enabled }, async () => {
  const { configureWhatsapp, sendWhatsapp } = await import("@/modules/notifications/services/whatsapp");
  const db = getDb();
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "whatsapp" } });
  const userId = `wa-${randomUUID()}`;
  const calls: unknown[] = [];
  const transport = async (input: unknown) => { calls.push(input); return { ok: true, providerId: "wamid.1" }; };
  try {
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    assert.equal(await sendWhatsapp(userId, 1, "https://erp.example.de/n", transport), null, "not configured");
    await assert.rejects(configureWhatsapp({ enabled: true, accessToken: "EAAG-test", phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de" }, "admin"), /whatsappNotReady/, "approval confirmation missing");
    await configureWhatsapp({ enabled: true, accessToken: "EAAG-test", phoneNumberId: "123456789", templateName: "verein_notification", templateLanguage: "de", templateApproved: true }, "admin");
    assert.equal(await sendWhatsapp(userId, 1, "https://erp.example.de/n", transport), null, "no verified link");
    await db.notificationChannelLink.create({ data: { userId, channel: "whatsapp", addressEnc: sealSecret("notification-channel-address", "+4915112345678"), addressHash: "h", verifiedAt: new Date() } });
    assert.deepEqual(await sendWhatsapp(userId, 2, "https://erp.example.de/n", transport), { ok: true, providerId: "wamid.1" });
    assert.equal(calls.length, 1);
    assert.equal(JSON.stringify(calls[0]).includes("4915112345678"), true);
  } finally {
    await db.notificationChannelLink.deleteMany({ where: { userId } });
    await db.notificationChannelConfig.deleteMany({ where: { channel: "whatsapp" } });
    if (before) await db.notificationChannelConfig.create({ data: before as never });
  }
});
