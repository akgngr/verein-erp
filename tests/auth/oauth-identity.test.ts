import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decideOAuthSignIn, type OAuthUserSnapshot } from "@/modules/auth/services/oauth-identity";

const now = new Date("2026-11-26T12:00:00Z");
const user = (patch: Partial<OAuthUserSnapshot> = {}): OAuthUserSnapshot => ({
  id: "u1",
  name: "A",
  email: "a@example.test",
  role: "SECRETARY",
  isActive: true,
  lockedUntil: null,
  mustChangePassword: false,
  passwordHash: "hash",
  sessionEpoch: 0,
  ...patch,
});
const decide = (u: OAuthUserSnapshot | null, extra: Partial<{ hasActiveGrant: boolean; twoFactorEnabled: boolean }> = {}) =>
  decideOAuthSignIn({ user: u, now, hasActiveGrant: false, twoFactorEnabled: false, ...extra });

/** #612: Bağlı kimlik bile olsa parola girişindeki hesap kuralları aynen geçerlidir; ret her zaman kapalı-güvenli. */
describe("OAuth sign-in decision (#612)", () => {
  it("rejects an unlinked subject (no e-mail fallback, no provisioning)", () => {
    assert.deepEqual(decide(null), { ok: false, reason: "not_linked" });
  });

  it("rejects inactive and locked accounts", () => {
    assert.deepEqual(decide(user({ isActive: false })), { ok: false, reason: "inactive" });
    assert.deepEqual(decide(user({ lockedUntil: new Date(now.getTime() + 60_000) })), { ok: false, reason: "locked" });
  });

  it("requires an active grant for time-boxed roles", () => {
    assert.deepEqual(decide(user({ role: "TAX_ADVISOR" })), { ok: false, reason: "no_external_grant" });
    assert.deepEqual(decide(user({ role: "TAX_ADVISOR" }), { hasActiveGrant: true }), { ok: true });
  });

  it("fails closed for accounts with two-factor authentication", () => {
    assert.deepEqual(decide(user(), { twoFactorEnabled: true }), { ok: false, reason: "two_factor_enabled" });
  });

  it("accepts a linked, active account; an expired lock no longer blocks", () => {
    assert.deepEqual(decide(user()), { ok: true });
    assert.deepEqual(decide(user({ lockedUntil: new Date(now.getTime() - 60_000) })), { ok: true });
  });
});
