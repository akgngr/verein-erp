import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeTemplateParam, templateFor } from "@/modules/campaign-whatsapp/channels";
import { parseRecipientKey } from "@/modules/mailings/services/channel-consent";
import { readWebhookBody, sameSecret } from "@/shared/campaigns/webhook-body";

// #581: Kanal rızası, webhook sertleştirme ve tek tıkla çıkış (veritabanı gerektirmez).

test("telegram sends only with explicit consent (revoked consent is undefined, not false)", async () => {
  const { channels } = await import("@/modules/campaign-telegram/channels");
  const telegram = channels.channels.find((channel) => channel.key === "telegram")!;
  const base = { id: "m1", email: null, name: "A", optOut: false, vars: {}, telegramChatId: "42" };
  assert.equal(telegram.allowed({ ...base, consents: { telegram: true } }), true);
  assert.equal(telegram.allowed({ ...base, consents: {} }), false, "revoked → not in consents → no send");
  assert.equal(telegram.allowed({ ...base }), false, "no consents object → no send");
  assert.equal(telegram.allowed({ ...base, telegramChatId: null, consents: { telegram: true } }), false, "not linked");
});

test("webhook secrets compare UTF-8 bytes (no RangeError on multi-byte tokens)", () => {
  assert.equal(sameSecret("verify-token-1", "verify-token-1"), true);
  assert.equal(sameSecret("verify-token-2", "verify-token-1"), false);
  // Same UTF-16 length (2), different UTF-8 byte length: previously threw inside timingSafeEqual.
  assert.doesNotThrow(() => sameSecret("ä1", "ab"));
  assert.equal(sameSecret("ä1", "ab"), false);
  assert.equal(sameSecret("", ""), false, "empty expected secret never matches");
});

test("webhook bodies are size-limited while streaming", async () => {
  const small = new Request("https://example.org/hook", { method: "POST", body: "{\"ok\":true}" });
  assert.equal(await readWebhookBody(small, 1024), "{\"ok\":true}");
  const big = new Request("https://example.org/hook", { method: "POST", body: "x".repeat(2048) });
  assert.equal(await readWebhookBody(big, 1024), null);
  const declared = new Request("https://example.org/hook", { method: "POST", body: "x", headers: { "content-length": "999999" } });
  assert.equal(await readWebhookBody(declared, 1024), null);
});

test("whatsapp template params have no tabs/newlines/space runs; transactional uses the utility template", () => {
  assert.equal(sanitizeTemplateParam("Hallo\tAnna,\n\n  bitte    unterschreiben:  https://x"), "Hallo Anna, bitte unterschreiben: https://x");
  const config = { templateName: "newsletter", utilityTemplateName: "esign_link" };
  assert.equal(templateFor(config, undefined), "newsletter");
  assert.equal(templateFor(config, "marketing"), "newsletter");
  assert.equal(templateFor(config, "transactional"), "esign_link");
  assert.equal(templateFor({ templateName: "newsletter" }, "transactional"), null, "never falls back to the marketing template");
});

test("recipient keys keep record ids that contain colons", () => {
  assert.deepEqual(parseRecipientKey("members:members:abc"), { moduleKey: "members", sourceKey: "members", recordId: "abc" });
  assert.deepEqual(parseRecipientKey("events:attendees:e1:a2"), { moduleKey: "events", sourceKey: "attendees", recordId: "e1:a2" });
  assert.equal(parseRecipientKey("members:members"), null);
});
