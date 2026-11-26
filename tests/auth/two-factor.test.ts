import "server-only";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { describe } from "node:test";

import { getDb } from "@/shared/db";

/** #603 part 2 — optional TOTP second factor: RFC 6238, replay protection, recovery codes, login step, admin reset. */
describe("TOTP (pure)", () => {
  test("RFC 6238 SHA-1 test vectors (8 and 6 digits)", async () => {
    const { hotp, TOTP_PERIOD_SECONDS } = await import("@/modules/auth/services/totp");
    const secret = Buffer.from("12345678901234567890", "ascii");
    const vectors: Array<[number, string]> = [
      [59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"],
      [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"],
    ];
    for (const [seconds, expected] of vectors) {
      const step = Math.floor(seconds / TOTP_PERIOD_SECONDS);
      assert.equal(hotp(secret, step, 8), expected, `T=${seconds}`);
      assert.equal(hotp(secret, step), expected.slice(2), `T=${seconds} (6 digits)`);
    }
  });

  test("base32 (RFC 4648) round trip; generated secrets are 160 bit", async () => {
    const { base32Decode, base32Encode, generateTotpSecret } = await import("@/modules/auth/services/totp");
    assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
    assert.equal(base32Decode("mzxw 6ytb-oi======")?.toString(), "foobar");
    assert.equal(base32Decode("not base32!"), null);
    const secret = generateTotpSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.equal(base32Decode(secret)?.length, 20);
    assert.notEqual(generateTotpSecret(), secret);
  });

  test("±1 step window, no older or reused step, malformed codes rejected", async () => {
    const { base32Decode, generateTotpSecret, hotp, matchTotpStep, totpStep } = await import("@/modules/auth/services/totp");
    const secret = generateTotpSecret();
    const key = base32Decode(secret)!;
    const now = new Date("2031-03-01T12:00:10Z");
    const step = totpStep(now);
    const code = (offset: number) => hotp(key, step + offset);
    assert.equal(matchTotpStep(secret, code(0), now, null), step);
    assert.equal(matchTotpStep(secret, code(-1), now, null), step - 1);
    assert.equal(matchTotpStep(secret, code(1), now, null), step + 1);
    assert.equal(matchTotpStep(secret, code(-2), now, null), null);
    assert.equal(matchTotpStep(secret, code(2), now, null), null);
    // Replay: the step that was last accepted (or anything before it) never works again.
    assert.equal(matchTotpStep(secret, code(0), now, step), null);
    assert.equal(matchTotpStep(secret, code(-1), now, step), null);
    assert.equal(matchTotpStep(secret, code(1), now, step), step + 1);
    // "123 456" style input is accepted; anything else is not.
    assert.equal(matchTotpStep(secret, `${code(0).slice(0, 3)} ${code(0).slice(3)}`, now, null), step);
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 56 78"]) assert.equal(matchTotpStep(secret, bad, now, null), null, bad);
  });

  test("otpauth URI and manual key", async () => {
    const { formatManualKey, otpauthUri } = await import("@/modules/auth/services/totp");
    const uri = otpauthUri({ secret: "JBSWY3DPEHPK3PXP", account: "kasse@verein.example" });
    assert.ok(uri.startsWith("otpauth://totp/Verein%20ERP:kasse%40verein.example?"));
    const params = new URL(uri).searchParams;
    assert.equal(params.get("secret"), "JBSWY3DPEHPK3PXP");
    assert.equal(params.get("issuer"), "Verein ERP");
    assert.equal(params.get("digits"), "6");
    assert.equal(params.get("period"), "30");
    assert.equal(formatManualKey("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  });

  test("recovery codes: ten unique codes, typed case-insensitively, stored as hash", async () => {
    const { generateRecoveryCodes, hashRecoveryCode, normalizeRecoveryCode } = await import("@/modules/auth/services/totp");
    const codes = generateRecoveryCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    for (const value of codes) assert.match(value, /^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    const typed = ` ${codes[0]!.toLowerCase().replace("-", " ")} `;
    assert.equal(normalizeRecoveryCode(typed), codes[0]!.replace("-", ""));
    assert.equal(normalizeRecoveryCode("123456"), null);
    assert.match(hashRecoveryCode(normalizeRecoveryCode(codes[0]!)!), /^[0-9a-f]{64}$/);
    assert.notEqual(hashRecoveryCode("AAAAAAAA"), hashRecoveryCode("AAAAAAAB"));
  });

  test("re-issue ticket: bound to user and secret, short-lived, tamper-proof", async () => {
    const { createReissueTicket, isReissueTicketValid } = await import("@/modules/auth/services/totp");
    const now = new Date("2031-03-01T12:00:00Z");
    const ticket = createReissueTicket("user-a", "secret-0123456789", now);
    assert.equal(isReissueTicketValid(ticket, "user-a", "secret-0123456789", now), true);
    assert.equal(isReissueTicketValid(ticket, "user-b", "secret-0123456789", now), false);
    assert.equal(isReissueTicketValid(ticket, "user-a", "other-secret-0123", now), false);
    assert.equal(isReissueTicketValid(ticket, "user-a", "secret-0123456789", new Date(now.getTime() + 61_000)), false);
    const [expires, mac] = ticket.split(".");
    assert.equal(isReissueTicketValid(`${Number(expires) + 1000}.${mac}`, "user-a", "secret-0123456789", now), false);
    assert.equal(isReissueTicketValid(`${expires}.${mac}x`, "user-a", "secret-0123456789", now), false);
    for (const bad of [undefined, null, 42, "", "a.b.c", "x".repeat(300)]) assert.equal(isReissueTicketValid(bad, "user-a", "secret-0123456789", now), false);
  });
});

describe("TOTP (wiring contracts)", () => {
  test("internal re-issue sign-ins carry the ticket; the login form and provider forward the code", () => {
    for (const file of ["src/modules/auth/actions/change-password.ts", "src/modules/auth/actions/sessions.ts"]) {
      assert.match(fs.readFileSync(file, "utf8"), /reissue: createReissueTicket\(dbUser\.id, getEnv\(\)\.AUTH_SECRET\)/, file);
    }
    assert.match(fs.readFileSync("src/modules/auth/auth.ts", "utf8"), /otp: \{ label: "otp" \}/);
    assert.match(fs.readFileSync("src/modules/auth/actions/login.ts", "utf8"), /two_factor_required: "auth\.errors\.twoFactorRequired"/);
    const authorize = fs.readFileSync("src/modules/auth/services/authorize.ts", "utf8");
    const passwordCheck = authorize.indexOf("verifyPassword(parsed.data.password, user.passwordHash)");
    const factorCheck = authorize.indexOf("checkLoginSecondFactor(");
    assert.ok(passwordCheck > 0 && passwordCheck < factorCheck, "the code is only checked after a correct password");
    assert.ok(factorCheck < authorize.indexOf('action: "LOGIN_SUCCESS"'), "second factor is checked before success");
    assert.match(authorize, /if \(secondFactor === "required"\) throw new TwoFactorRequiredError\(\);/);
    // A wrong code counts towards the account lockout like a wrong password.
    const invalidBranch = authorize.slice(authorize.indexOf('if (secondFactor === "invalid")'), authorize.indexOf("throw new TwoFactorInvalidError()"));
    assert.match(invalidBranch, /getLoginFailureState\(user\.failedLoginCount, user\.lockedUntil, now\)/);
    assert.match(invalidBranch, /reason: "second_factor_invalid"/);
  });

  test("user deletion removes the second factor", () => {
    const lifecycle = fs.readFileSync("src/modules/auth/lifecycle.ts", "utf8");
    assert.match(lifecycle, /userTotp\.deleteMany\(\{ where: \{ userId \} \}\)/);
    assert.match(lifecycle, /userTotpRecoveryCode\.deleteMany\(\{ where: \{ userId \} \}\)/);
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

async function createUser(password: string) {
  const { hashPassword } = await import("@/shared/security/password");
  const email = `${randomUUID()}@totp.example.test`;
  return getDb().user.create({ data: { name: "TOTP User", email, passwordHash: await hashPassword(password), role: "TREASURER", isActive: true } });
}

async function cleanup(userId: string) {
  const db = getDb();
  await db.userTotp.deleteMany({ where: { userId } });
  await db.userTotpRecoveryCode.deleteMany({ where: { userId } });
  await db.auditLog.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}

test("db: enrolment, encrypted secret, one-time TOTP steps and recovery codes, admin reset", { skip: !enabled }, async () => {
  const { base32Decode, hotp, totpStep } = await import("@/modules/auth/services/totp");
  const two = await import("@/modules/auth/services/two-factor");
  const db = getDb();
  const user = await createUser("Totp-Test-Passwort-1");
  try {
    const now = new Date("2031-03-01T12:00:10Z");
    const step = totpStep(now);
    assert.deepEqual(await two.getTwoFactorStatus(user.id), { enabled: false, recoveryCodesLeft: 0 });

    const enrolment = await two.startTotpEnrolment(user.id, user.email);
    const secret = enrolment.manualKey.replace(/\s/g, "");
    const key = base32Decode(secret)!;
    const row = await db.userTotp.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(row.enabledAt, null);
    assert.ok(!row.secretEnc.includes(secret), "the secret is stored encrypted");
    assert.equal(await two.isTwoFactorEnabled(user.id), false, "an unconfirmed enrolment is not required at login");
    assert.equal(await two.verifySecondFactor(user.id, hotp(key, step), now), null);

    await assert.rejects(two.confirmTotpEnrolment(user.id, "000000", now), /codeInvalid/);
    const { recoveryCodes } = await two.confirmTotpEnrolment(user.id, hotp(key, step), now);
    assert.equal(recoveryCodes.length, 10);
    assert.deepEqual(await two.getTwoFactorStatus(user.id), { enabled: true, recoveryCodesLeft: 10 });
    const stored = await db.userTotpRecoveryCode.findMany({ where: { userId: user.id } });
    assert.ok(stored.every((entry) => !recoveryCodes.some((plain) => entry.codeHash.includes(plain.replace("-", "")))), "only hashes are stored");
    await assert.rejects(two.startTotpEnrolment(user.id, user.email), /alreadyEnabled/);

    // The code used to confirm cannot log in (same step); the next step works exactly once.
    assert.equal(await two.verifySecondFactor(user.id, hotp(key, step), now), null);
    const next = hotp(key, step + 1);
    const results = await Promise.all([two.verifySecondFactor(user.id, next, now), two.verifySecondFactor(user.id, next, now)]);
    assert.deepEqual(results.sort(), [null, "totp"], "concurrent use of one code succeeds once");
    assert.equal(await two.verifySecondFactor(user.id, hotp(key, step - 1), now), null, "older step after a newer one");

    // Recovery code: case-insensitive, once.
    const typed = recoveryCodes[3]!.toLowerCase();
    assert.equal(await two.verifySecondFactor(user.id, typed, now), "recovery");
    assert.equal(await two.verifySecondFactor(user.id, typed, now), null);
    assert.equal(await two.verifySecondFactor(user.id, "AAAA-AAAA", now), null);
    assert.equal((await two.getTwoFactorStatus(user.id)).recoveryCodesLeft, 9);

    const replaced = await two.regenerateRecoveryCodes(user.id);
    assert.equal((await two.getTwoFactorStatus(user.id)).recoveryCodesLeft, 10);
    assert.equal(await two.verifySecondFactor(user.id, recoveryCodes[0]!, now), null, "old codes stop working");
    assert.equal(await two.verifySecondFactor(user.id, replaced[0]!, now), "recovery");

    assert.equal(await two.removeTwoFactor(user.id), true);
    assert.equal(await two.removeTwoFactor(user.id), false);
    assert.equal(await db.userTotpRecoveryCode.count({ where: { userId: user.id } }), 0);
    assert.equal(await two.isTwoFactorEnabled(user.id), false);
  } finally {
    await cleanup(user.id);
  }
});

test("db: login step 2 is asked only when enabled; codes once; re-issue ticket replaces the code for that user only", { skip: !enabled }, async () => {
  const { base32Decode, createReissueTicket, hotp, totpStep } = await import("@/modules/auth/services/totp");
  const two = await import("@/modules/auth/services/two-factor");
  const user = await createUser("Totp-Login-Passwort-1");
  const authSecret = "test-auth-secret-0123456789";
  const check = (input: { otp?: unknown; reissue?: unknown }, now: Date) => two.checkLoginSecondFactor({ userId: user.id, otp: input.otp, reissue: input.reissue, authSecret, now });
  try {
    const now = new Date("2031-03-01T12:00:10Z");
    const step = totpStep(now);
    assert.equal(await check({}, now), "notEnabled", "2FA off: the password alone signs in");

    const { manualKey } = await two.startTotpEnrolment(user.id, user.email);
    const key = base32Decode(manualKey.replace(/\s/g, ""))!;
    assert.equal(await check({}, now), "notEnabled", "an unconfirmed enrolment does not lock anyone out");
    await two.confirmTotpEnrolment(user.id, hotp(key, step), now);

    assert.equal(await check({}, now), "required");
    assert.equal(await check({ otp: "   " }, now), "required");
    assert.equal(await check({ otp: hotp(key, step) }, now), "invalid", "the confirmation code cannot be replayed");
    assert.equal(await check({ otp: "000000" }, now), "invalid");
    assert.equal(await check({ otp: hotp(key, step + 1) }, now), "totp");
    assert.equal(await check({ otp: hotp(key, step + 1) }, now), "invalid");
    assert.equal(await check({ reissue: createReissueTicket(user.id, authSecret, now) }, now), "reissued");
    assert.equal(await check({ reissue: createReissueTicket("someone-else", authSecret, now) }, now), "required");
    assert.equal(await check({ reissue: createReissueTicket(user.id, "another-secret-012345", now) }, now), "required");

    await two.removeTwoFactor(user.id);
    assert.equal(await check({}, now), "notEnabled", "after an admin reset the password alone works again");
  } finally {
    await cleanup(user.id);
  }
});
