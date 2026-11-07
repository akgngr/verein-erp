import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const equal = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** seven.io imza desteklemediği için gizli yol: API anahtarından türetilir (anahtar değişince değişir). */
export function sevenWebhookSecret(apiKey: string): string {
  return createHash("sha256").update(`verein-erp:seven-webhook:${apiKey}`).digest("base64url").slice(0, 32);
}

export const verifySevenSecret = (apiKey: string, given: string) => equal(sevenWebhookSecret(apiKey), given);

/**
 * Twilio isteği doğrulama: base64(HMAC-SHA1(authToken, tam URL + sıralı (anahtar+değer)…)).
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const data = url + Object.keys(params).sort().map((key) => key + params[key]).join("");
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return equal(expected, signature);
}

export type SmsStatus = "DELIVERED" | "FAILED" | null;

export function mapTwilioStatus(status: string): SmsStatus {
  if (status === "delivered") return "DELIVERED";
  if (status === "undelivered" || status === "failed") return "FAILED";
  return null;
}

export function mapSevenStatus(status: string): SmsStatus {
  const value = status.toUpperCase();
  if (value === "DELIVERED") return "DELIVERED";
  if (["NOTDELIVERED", "FAILED", "REJECTED", "EXPIRED"].includes(value)) return "FAILED";
  return null;
}
