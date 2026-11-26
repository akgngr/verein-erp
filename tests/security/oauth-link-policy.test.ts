import test from "node:test";
import assert from "node:assert/strict";
import { linkCallbackDisposition, matchesLinkIntent, validLinkToken, validReturnPath } from "../../src/modules/auth/services/oauth-link-policy";

const now = new Date("2026-11-26T12:00:00Z");
const intent = { userId: "u1", provider: "google", sessionVersion: "v1", expiresAt: new Date(now.getTime() + 300000) };
const input = { userId: "u1", provider: "google", sessionVersion: "v1", twoFactorEnabled: false, now };

test("link intent is bound to the local user, provider, session version, expiry and MFA policy", () => {
  assert.equal(matchesLinkIntent(intent, input), true);
  for (const change of [{ userId: "u2" }, { provider: "facebook" }, { sessionVersion: "v2" }, { sessionVersion: undefined }, { twoFactorEnabled: true }, { now: intent.expiresAt }]) {
    assert.equal(matchesLinkIntent(intent, { ...input, ...change }), false);
  }
});
test("link token is canonical base64url and redirect remains an internal path", () => {
  assert.equal(validLinkToken("a".repeat(43)), true);
  assert.equal(validLinkToken("a".repeat(42)), false);
  assert.equal(validReturnPath("/ayarlar/sosyal-giris"), true);
  for (const path of ["//evil.example", "https://evil.example", "/../admin", "/%2f%2fevil.example", "/a?b=c", "/a\\evil"]) {
    assert.equal(validReturnPath(path), false);
  }
});

test("expired or missing link intent never becomes an ordinary login", () => {
  const expired = matchesLinkIntent(intent, { ...input, now: intent.expiresAt });
  assert.equal(linkCallbackDisposition({ cookiePresent: true, authenticated: true, intentMatches: expired }), "denied");
  assert.equal(linkCallbackDisposition({ cookiePresent: true, authenticated: false, intentMatches: false }), "denied");
  assert.equal(linkCallbackDisposition({ cookiePresent: false, authenticated: true, intentMatches: false }), "denied");
  assert.equal(linkCallbackDisposition({ cookiePresent: false, authenticated: false, intentMatches: false }), "login");
  assert.equal(linkCallbackDisposition({ cookiePresent: true, authenticated: true, intentMatches: true }), "link");
});
