/** #603: self-service password reset (one-time, 30 min, purpose-bound, no enumeration) and "sign out all devices". */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { describe } from "node:test";

import { getDb } from "@/shared/db";

describe("password reset & sessions (pure)", () => {
  test("session version: epoch 0 keeps existing sessions valid, any bump invalidates them", async () => {
    const { computeSessionVersion, isSessionVersionValid } = await import("@/modules/auth/services/session-version");
    const legacy = computeSessionVersion("hash", "secret");
    assert.equal(computeSessionVersion("hash", "secret", 0), legacy, "no forced logout on deploy");
    assert.equal(isSessionVersionValid(legacy, "hash", "secret", 0), true);
    assert.equal(isSessionVersionValid(legacy, "hash", "secret", 1), false, "sign-out-all ends old sessions");
    const bumped = computeSessionVersion("hash", "secret", 1);
    assert.equal(isSessionVersionValid(bumped, "hash", "secret", 1), true);
    assert.notEqual(computeSessionVersion("hash", "secret", 2), bumped);
  });

  test("reset link is https-only; mail has only the link, no password", async () => {
    const { passwordResetLink, resetMail } = await import("@/modules/users/services/password-reset");
    assert.equal(passwordResetLink("https://erp.example.de/x", "tok"), "https://erp.example.de/sifre-sifirla/tok");
    assert.equal(passwordResetLink("http://erp.example.de", "tok"), null);
    const mail = resetMail("de", { name: "Pat", link: "https://erp.example.de/sifre-sifirla/tok" });
    assert.match(mail.text, /sifre-sifirla\/tok/);
    assert.match(mail.text, /30 Minuten/);
    assert.doesNotMatch(mail.text, /passwor[dt]:\s*\S/i);
  });

  test("auth gate lets the reset pages through without a session; request action defers lookup with after()", () => {
    const config = fs.readFileSync("src/modules/auth/auth.config.ts", "utf8");
    assert.match(config, /path === "\/sifremi-unuttum" \|\| path\.startsWith\("\/sifre-sifirla\/"\)/);
    const action = fs.readFileSync("src/modules/users/actions/password-reset.ts", "utf8");
    assert.match(action, /schedule: \(task\) => after\(task\)/);
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: reset request, purpose separation, 30 min expiry, one-time use, revocation and lockout clearing", { skip: !enabled }, async () => {
  const { requestPasswordReset } = await import("@/modules/users/services/password-reset");
  const { createInvitation, acceptInvitation, findUsableInvitation } = await import("@/modules/users/services/invitations");
  const db = getDb();
  const email = `${randomUUID()}@reset.example.test`;
  const user = await db.user.create({ data: { name: "Reset User", email, passwordHash: "x", role: "AUDITOR", isActive: true, failedLoginCount: 4, lockedUntil: new Date("2031-01-01T12:00:00Z") } });
  const ip = `10.0.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const sent: Array<{ to: string; text: string }> = [];
  const deliver = async (message: { to: string; text: string }) => { sent.push(message); return true; };
  try {
    const now = new Date("2031-01-01T10:00:00Z");
    process.env.APP_URL ??= "https://erp.example.test";

    // Unknown address: same outcome, nothing sent.
    assert.equal(await requestPasswordReset({ email: `nobody-${randomUUID()}@reset.example.test`, clientIp: ip }, { deliver }, now), "accepted");
    assert.equal(sent.length, 0);

    // Known address: mail with a link; the raw token is never stored.
    assert.equal(await requestPasswordReset({ email: email.toUpperCase(), clientIp: ip }, { deliver }, now), "accepted");
    assert.equal(sent.length, 1);
    const token = /sifre-sifirla\/([A-Za-z0-9_-]+)/.exec(sent[0]!.text)?.[1];
    assert.ok(token);
    assert.equal(await db.userInvitation.count({ where: { tokenHash: token } }), 0);

    // Purpose separation: a reset token is not an invitation and vice versa.
    assert.equal(await findUsableInvitation(token!, now), null);
    assert.equal((await findUsableInvitation(token!, now, "RESET"))?.userId, user.id);
    const invite = await createInvitation(user.id, "admin", now);
    assert.equal(await findUsableInvitation(invite.token, now, "RESET"), null);
    assert.equal(await findUsableInvitation(token!, new Date(now.getTime() + 31 * 60_000), "RESET"), null, "expires after 30 min");

    // Use: password set, lockout cleared, other pending links (the invite) revoked, second use fails.
    await acceptInvitation(token!, "Sehr-sicheres-Passwort-2031!", now, "RESET");
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.notEqual(updated.passwordHash, "x");
    assert.equal(updated.failedLoginCount, 0);
    assert.equal(updated.lockedUntil, null);
    assert.equal(await findUsableInvitation(invite.token, now), null, "pending invitation revoked by the reset");
    await assert.rejects(acceptInvitation(token!, "Sehr-sicheres-Passwort-2031!", now, "RESET"), /invalid/);

    // Per-address rate limit (3 per 15 min); the response gives nothing away beyond "try later".
    const limited = [];
    for (let i = 0; i < 3; i += 1) limited.push(await requestPasswordReset({ email, clientIp: null }, { deliver }, now));
    assert.deepEqual(limited.slice(-1), ["rateLimited"]);
  } finally {
    await db.userInvitation.deleteMany({ where: { userId: user.id } });
    await db.securityRateLimit.deleteMany({ where: { key: { startsWith: "reset:" } } });
    await db.user.delete({ where: { id: user.id } });
  }
});
