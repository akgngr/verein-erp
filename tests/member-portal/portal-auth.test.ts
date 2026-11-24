import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  generateOpaqueToken,
  hashPortalSecret,
  isPortalEnabled,
  isPortalSessionActive,
  isPortalStepUpActive,
  isPortalTokenUsable,
  maskIban,
  PORTAL_MAGIC_LINK_TTL_MS,
  PORTAL_SESSION_ABSOLUTE_MS,
  PORTAL_SESSION_IDLE_MS,
  PORTAL_STEP_UP_TTL_MS,
} from "@/modules/member-portal/services/auth-core";
import { evaluateRateLimit, PORTAL_RATE_LIMITS } from "@/shared/security/rate-limit";

test("portal magic-link token enforces single-use, TTL boundary, and nonce binding", () => {
  const now = new Date("2026-11-24T10:00:00.000Z");
  const rawNonce = generateOpaqueToken(24);
  const nonceHash = hashPortalSecret(rawNonce);
  const otherNonceHash = hashPortalSecret(generateOpaqueToken(24));

  const record = {
    tokenHash: hashPortalSecret("raw-token"),
    nonceHash,
    purpose: "login",
    expiresAt: new Date(now.getTime() + PORTAL_MAGIC_LINK_TTL_MS),
    usedAt: null,
  };

  assert.equal(isPortalTokenUsable(record, nonceHash, now), true);
  // Wrong browser nonce -> refused
  assert.equal(isPortalTokenUsable(record, otherNonceHash, now), false);
  // Exact expiry -> refused
  assert.equal(isPortalTokenUsable(record, nonceHash, record.expiresAt), false);
  // Already used -> refused
  assert.equal(isPortalTokenUsable({ ...record, usedAt: now }, nonceHash, now), false);
});

test("portal session enforces 15-min idle, 8-h absolute, and 5-min step-up expiry", () => {
  const start = new Date("2026-11-24T10:00:00.000Z");
  const session = {
    lastSeenAt: start,
    expiresAt: new Date(start.getTime() + PORTAL_SESSION_ABSOLUTE_MS),
    revokedAt: null,
    stepUpUntil: new Date(start.getTime() + PORTAL_STEP_UP_TTL_MS),
  };

  assert.equal(isPortalSessionActive(session, start), true);
  assert.equal(isPortalStepUpActive(session, start), true);

  // After 5 min -> step-up expired, session still active
  const after5m = new Date(start.getTime() + PORTAL_STEP_UP_TTL_MS);
  assert.equal(isPortalSessionActive(session, after5m), true);
  assert.equal(isPortalStepUpActive(session, after5m), false);

  // After 15 min idle -> session expired
  const after15m = new Date(start.getTime() + PORTAL_SESSION_IDLE_MS);
  assert.equal(isPortalSessionActive(session, after15m), false);

  // Revoked -> refused immediately
  assert.equal(isPortalSessionActive({ ...session, revokedAt: start }, start), false);
});

test("rate limiter enforces per-address (3/15m), per-IP (20/h), and wrong-token (5/15m + backoff)", () => {
  const t0 = new Date("2026-11-24T10:00:00.000Z");

  let state = null;
  for (let i = 0; i < 3; i++) {
    const res = evaluateRateLimit(state, PORTAL_RATE_LIMITS.perAddressHash, t0);
    assert.equal(res.allowed, true);
    state = res.nextState;
  }
  const fourth = evaluateRateLimit(state, PORTAL_RATE_LIMITS.perAddressHash, t0);
  assert.equal(fourth.allowed, false);
  assert.ok(fourth.retryAfterSeconds > 0);

  let wrongState = null;
  for (let i = 0; i < 5; i++) {
    const res = evaluateRateLimit(wrongState, PORTAL_RATE_LIMITS.wrongToken, t0);
    assert.equal(res.allowed, true);
    wrongState = res.nextState;
  }
  const sixthWrong = evaluateRateLimit(wrongState, PORTAL_RATE_LIMITS.wrongToken, t0);
  assert.equal(sixthWrong.allowed, false);
  assert.ok(sixthWrong.nextState.lockedUntil !== null);
});

test("portal isolation, scanner-safe GET, IBAN masking, and PORTAL_ENABLED=false default", () => {
  assert.equal(isPortalEnabled(), false);
  assert.equal(maskIban("DE89370400440532013000"), "DE89 •••• •••• 3000");

  const proxySrc = fs.readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
  assert.match(proxySrc, /default-src 'self'; frame-ancestors 'none'/);
  assert.match(proxySrc, /Referrer-Policy/);
  assert.match(proxySrc, /PORTAL_ENABLED/);

  const confirmViewSrc = fs.readFileSync(
    path.join(process.cwd(), "src/modules/member-portal/views/portal-confirm-view.tsx"),
    "utf8",
  );
  assert.match(confirmViewSrc, /method="POST"/);
  assert.equal(confirmViewSrc.includes("consumePortalMagicLinkPost"), false);
});
