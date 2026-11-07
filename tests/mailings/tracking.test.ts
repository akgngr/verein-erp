import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { mapSevenStatus, mapTwilioStatus, sevenWebhookSecret, verifySevenSecret, verifyTwilioSignature } from "@/modules/campaign-sms/services/webhook";
import { extractStatuses, verifyMetaSignature } from "@/modules/campaign-whatsapp/services/webhook";
import { injectTracking, isRedirectable, signLink, verifyLink } from "@/modules/mailings/services/tracking";

// İmza anahtarı çağrı anında okunur.
process.env.AUTH_SECRET ??= "test-secret-for-tracking";

describe("Email tracking", () => {
  test("links are rewritten to signed redirects and a pixel is appended", () => {
    const html = '<html><body><a href="https://verein.example/fest?a=1&amp;b=2">x</a><a href="mailto:a@b.de">m</a></body></html>';
    const out = injectTracking(html, "https://app.example/", "tok_abcdefghijklmnopqrst");
    assert.ok(out.includes("https://app.example/api/mailings/t/c/tok_abcdefghijklmnopqrst?u=https%3A%2F%2Fverein.example%2Ffest%3Fa%3D1%26b%3D2&amp;s="));
    assert.ok(out.includes('href="mailto:a@b.de"'), "non-http links stay untouched");
    assert.ok(out.includes('<img src="https://app.example/api/mailings/t/o/tok_abcdefghijklmnopqrst"'));
    assert.ok(out.indexOf("<img") < out.indexOf("</body>"));
  });

  test("redirect signature binds token and target (no open redirect)", () => {
    const sig = signLink("tok1", "https://verein.example/a");
    assert.equal(verifyLink("tok1", "https://verein.example/a", sig), true);
    assert.equal(verifyLink("tok1", "https://evil.example/a", sig), false);
    assert.equal(verifyLink("tok2", "https://verein.example/a", sig), false);
    assert.equal(isRedirectable("javascript:alert(1)"), false);
    assert.equal(isRedirectable("https://ok.example/x"), true);
  });
});

describe("SMS delivery reports", () => {
  test("Twilio signature (documented algorithm) and status mapping", () => {
    const params = { MessageSid: "SM1", MessageStatus: "delivered", To: "+4915112345678" };
    const url = "https://app.example/api/campaign-sms/webhook/twilio";
    const data = url + Object.keys(params).sort().map((key) => key + params[key as keyof typeof params]).join("");
    const signature = createHmac("sha1", "auth-token").update(data).digest("base64");
    assert.equal(verifyTwilioSignature("auth-token", url, params, signature), true);
    assert.equal(verifyTwilioSignature("other-token", url, params, signature), false);
    assert.equal(mapTwilioStatus("delivered"), "DELIVERED");
    assert.equal(mapTwilioStatus("undelivered"), "FAILED");
    assert.equal(mapTwilioStatus("sent"), null);
  });

  test("seven.io secret path and status mapping", () => {
    const secret = sevenWebhookSecret("key-1");
    assert.equal(verifySevenSecret("key-1", secret), true);
    assert.equal(verifySevenSecret("key-2", secret), false);
    assert.equal(mapSevenStatus("DELIVERED"), "DELIVERED");
    assert.equal(mapSevenStatus("NOTDELIVERED"), "FAILED");
    assert.equal(mapSevenStatus("BUFFERED"), null);
  });
});

describe("WhatsApp status webhooks", () => {
  test("Meta signature and status extraction (delivered/read/failed)", () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [
      { id: "wamid.1", status: "delivered", timestamp: "1767000000" },
      { id: "wamid.1", status: "read", timestamp: "1767000100" },
      { id: "wamid.2", status: "sent" },
      { id: "wamid.3", status: "failed", errors: [{ code: 131026 }] },
    ] } }] }] });
    const header = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    assert.equal(verifyMetaSignature("app-secret", body, header), true);
    assert.equal(verifyMetaSignature("app-secret", `${body} `, header), false);
    const statuses = extractStatuses(JSON.parse(body));
    assert.deepEqual(statuses.map((item) => [item.providerId, item.status]), [["wamid.1", "DELIVERED"], ["wamid.1", "READ"], ["wamid.3", "FAILED"]]);
    assert.equal(statuses[2].error, "WHATSAPP_131026");
    assert.equal(statuses[0].at?.getTime(), 1767000000 * 1000);
  });
});
