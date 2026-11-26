import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import {
  formatManualKey, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, isReissueTicketValid, matchTotpStep,
  normalizeRecoveryCode, otpauthUri,
} from "./totp";

/**
 * #603 — optional TOTP second factor, database side. The secret is sealed with the secret box (purpose below);
 * recovery codes are stored as SHA-256 hashes and consumed with a conditional update, so each works exactly once
 * even under concurrent logins. The same holds for TOTP steps (`lastUsedStep`).
 */
const PURPOSE = "auth.totp";

export class TwoFactorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwoFactorError";
  }
}

export type TwoFactorStatus = { enabled: boolean; recoveryCodesLeft: number };

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const db = getDb();
  const row = await db.userTotp.findUnique({ where: { userId }, select: { enabledAt: true } });
  if (!row?.enabledAt) return { enabled: false, recoveryCodesLeft: 0 };
  const recoveryCodesLeft = await db.userTotpRecoveryCode.count({ where: { userId, usedAt: null } });
  return { enabled: true, recoveryCodesLeft };
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const row = await getDb().userTotp.findUnique({ where: { userId }, select: { enabledAt: true } });
  return Boolean(row?.enabledAt);
}

/**
 * Starts (or restarts) enrolment: a new secret replaces any unconfirmed one. Refused while 2FA is on — it must be
 * turned off first, so a stolen session cannot silently move the factor to another device.
 */
export async function startTotpEnrolment(userId: string, account: string): Promise<{ manualKey: string; otpauthUri: string }> {
  const db = getDb();
  const existing = await db.userTotp.findUnique({ where: { userId }, select: { enabledAt: true } });
  if (existing?.enabledAt) throw new TwoFactorError("auth.twoFactor.errors.alreadyEnabled");
  const secret = generateTotpSecret();
  const secretEnc = sealSecret(PURPOSE, secret);
  await db.userTotp.upsert({
    where: { userId },
    create: { userId, secretEnc },
    update: { secretEnc, enabledAt: null, lastUsedStep: null },
  });
  return { manualKey: formatManualKey(secret), otpauthUri: otpauthUri({ secret, account }) };
}

/** Confirms enrolment with a code from the app; turns 2FA on and returns the one-time recovery codes (shown once). */
export async function confirmTotpEnrolment(userId: string, code: string, now = new Date()): Promise<{ recoveryCodes: string[] }> {
  const db = getDb();
  const row = await db.userTotp.findUnique({ where: { userId } });
  if (!row) throw new TwoFactorError("auth.twoFactor.errors.noEnrolment");
  if (row.enabledAt) throw new TwoFactorError("auth.twoFactor.errors.alreadyEnabled");
  const secret = openSecret(PURPOSE, row.secretEnc);
  const step = secret ? matchTotpStep(secret, code, now, row.lastUsedStep) : null;
  if (step === null) throw new TwoFactorError("auth.twoFactor.errors.codeInvalid");
  const recoveryCodes = generateRecoveryCodes();
  await db.$transaction(async (tx) => {
    // Conditional: a concurrent confirm or a restarted enrolment (new secret) cannot be confirmed twice.
    const updated = await tx.userTotp.updateMany({
      where: { userId, secretEnc: row.secretEnc, enabledAt: null },
      data: { enabledAt: now, lastUsedStep: step },
    });
    if (updated.count !== 1) throw new TwoFactorError("auth.twoFactor.errors.codeInvalid");
    await tx.userTotpRecoveryCode.deleteMany({ where: { userId } });
    await tx.userTotpRecoveryCode.createMany({
      data: recoveryCodes.map((plain) => ({ userId, codeHash: hashRecoveryCode(normalizeRecoveryCode(plain)!) })),
    });
  });
  return { recoveryCodes };
}

export type SecondFactorResult = "totp" | "recovery" | null;

/**
 * Login step 2: accepts a current TOTP code (each step once) or an unused recovery code (once). Returns which one
 * matched, or null. Only meaningful when 2FA is enabled.
 */
export async function verifySecondFactor(userId: string, input: string, now = new Date()): Promise<SecondFactorResult> {
  const db = getDb();
  const row = await db.userTotp.findUnique({ where: { userId } });
  if (!row?.enabledAt) return null;
  const code = input.trim();

  if (/^\d{3}\s?\d{3}$/.test(code)) {
    const secret = openSecret(PURPOSE, row.secretEnc);
    const step = secret ? matchTotpStep(secret, code, now, row.lastUsedStep) : null;
    if (step === null) return null;
    const claimed = await db.userTotp.updateMany({
      where: { userId, enabledAt: { not: null }, OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }] },
      data: { lastUsedStep: step },
    });
    return claimed.count === 1 ? "totp" : null;
  }

  const normalized = normalizeRecoveryCode(code);
  if (!normalized) return null;
  const used = await db.userTotpRecoveryCode.updateMany({
    where: { userId, codeHash: hashRecoveryCode(normalized), usedAt: null },
    data: { usedAt: now },
  });
  return used.count === 1 ? "recovery" : null;
}

export type LoginSecondFactor = "notEnabled" | "reissued" | "required" | "invalid" | "totp" | "recovery";

/**
 * Login step 2 decision (after the password was verified). "required": 2FA is on and no code was sent — the form
 * asks for it. Server-internal re-issues (password change, "sign out other devices") carry a short-lived HMAC
 * ticket instead of a code: that session already passed the second factor.
 */
export async function checkLoginSecondFactor(input: {
  userId: string;
  otp: unknown;
  reissue: unknown;
  authSecret: string;
  now?: Date;
}): Promise<LoginSecondFactor> {
  const now = input.now ?? new Date();
  if (!(await isTwoFactorEnabled(input.userId))) return "notEnabled";
  if (isReissueTicketValid(input.reissue, input.userId, input.authSecret, now)) return "reissued";
  const otp = typeof input.otp === "string" ? input.otp.trim().slice(0, 32) : "";
  if (!otp) return "required";
  return (await verifySecondFactor(input.userId, otp, now)) ?? "invalid";
}

/** Replaces all recovery codes (requires a current code; checked by the caller via `verifySecondFactor`). */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const recoveryCodes = generateRecoveryCodes();
  await getDb().$transaction(async (tx) => {
    await tx.userTotpRecoveryCode.deleteMany({ where: { userId } });
    await tx.userTotpRecoveryCode.createMany({
      data: recoveryCodes.map((plain) => ({ userId, codeHash: hashRecoveryCode(normalizeRecoveryCode(plain)!) })),
    });
  });
  return recoveryCodes;
}

/** Turns 2FA off (own disable or admin reset). Returns whether a second factor was on. */
export async function removeTwoFactor(userId: string): Promise<boolean> {
  const db = getDb();
  const [removed] = await db.$transaction([
    db.userTotp.deleteMany({ where: { userId, enabledAt: { not: null } } }),
    db.userTotp.deleteMany({ where: { userId } }),
    db.userTotpRecoveryCode.deleteMany({ where: { userId } }),
  ]);
  return removed.count > 0;
}
