/** #606: campaign-sms, campaign-whatsapp, campaign-telegram — webhook authentication and status mapping (synthetic data). */
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";

test("campaign-sms: Twilio signature uses HMAC-SHA1 over URL + sorted params and rejects tampering", async () => {
  const { verifyTwilioSignature } = await import("@/modules/campaign-sms/services/webhook");
  const url = "https://erp.example.test/api/campaign-sms/webhook/twilio";
  const params = { MessageStatus: "delivered", MessageSid: "SM123", AccountSid: "AC1" };
  const data = url + "AccountSid" + "AC1" + "MessageSid" + "SM123" + "MessageStatus" + "delivered";
  const signature = createHmac("sha1", "token-abc").update(data).digest("base64");
  assert.equal(verifyTwilioSignature("token-abc", url, params, signature), true);
  assert.equal(verifyTwilioSignature("token-abc", url, { ...params, MessageStatus: "failed" }, signature), false, "tampered body");
  assert.equal(verifyTwilioSignature("other-token", url, params, signature), false, "wrong token");
});

test("campaign-sms: provider statuses map to DELIVERED / FAILED / ignored", async () => {
  const { mapTwilioStatus, mapSevenStatus } = await import("@/modules/campaign-sms/services/webhook");
  assert.equal(mapTwilioStatus("delivered"), "DELIVERED");
  assert.equal(mapTwilioStatus("undelivered"), "FAILED");
  assert.equal(mapTwilioStatus("failed"), "FAILED");
  assert.equal(mapTwilioStatus("sent"), null);
  assert.equal(mapSevenStatus("delivered"), "DELIVERED");
  for (const status of ["NOTDELIVERED", "failed", "REJECTED", "EXPIRED"]) assert.equal(mapSevenStatus(status), "FAILED", status);
  assert.equal(mapSevenStatus("BUFFERED"), null);
});

test("campaign-sms: seven.io webhook secret needs a strong app secret and an API key", async () => {
  const { sevenWebhookSecret, verifySevenSecret } = await import("@/modules/campaign-sms/services/webhook");
  const previous = process.env.AUTH_SECRET;
  try {
    process.env.AUTH_SECRET = "short";
    assert.equal(sevenWebhookSecret("key"), null, "weak app secret → no webhook");
    process.env.AUTH_SECRET = "a-sufficiently-long-app-secret";
    const secret = sevenWebhookSecret("key");
    assert.ok(secret && secret.length === 32);
    assert.equal(sevenWebhookSecret(""), null);
    assert.equal(verifySevenSecret("key", secret!), true);
    assert.equal(verifySevenSecret("other-key", secret!), false);
  } finally {
    process.env.AUTH_SECRET = previous;
  }
});

test("campaign-whatsapp: Meta signature (sha256=HMAC) over the raw body, constant length check", async () => {
  const { verifyMetaSignature } = await import("@/modules/campaign-whatsapp/services/webhook");
  const body = JSON.stringify({ entry: [] });
  const header = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
  assert.equal(verifyMetaSignature("app-secret", body, header), true);
  assert.equal(verifyMetaSignature("app-secret", body + " ", header), false);
  assert.equal(verifyMetaSignature("app-secret", body, "sha256=short"), false);
});

test("campaign-whatsapp: delivery statuses are extracted; unknown statuses and items without id are skipped", async () => {
  const { extractStatuses } = await import("@/modules/campaign-whatsapp/services/webhook");
  const statuses = extractStatuses({ entry: [{ changes: [{ value: { statuses: [
    { id: "wamid.1", status: "delivered", timestamp: "1767225600" },
    { id: "wamid.2", status: "failed", errors: [{ code: 131026 }] },
    { id: "wamid.3", status: "sent" },
    { status: "read" },
  ] } }] }] });
  assert.deepEqual(statuses.map((s) => [s.providerId, s.status, s.error ?? null]), [["wamid.1", "DELIVERED", null], ["wamid.2", "FAILED", "WHATSAPP_131026"]]);
  assert.equal(statuses[0]!.at?.toISOString(), "2026-01-01T00:00:00.000Z");
});

test("campaign-telegram: webhook secret is deterministic per bot token and not the token itself", async () => {
  const { webhookSecret } = await import("@/modules/campaign-telegram/services/telegram");
  const secret = webhookSecret("123:ABC");
  assert.equal(secret, createHash("sha256").update("verein-erp:telegram-webhook:123:ABC").digest("base64url").slice(0, 48));
  assert.equal(webhookSecret("123:ABC"), secret);
  assert.notEqual(webhookSecret("456:DEF"), secret);
  assert.equal(secret.includes("ABC"), false);
});
