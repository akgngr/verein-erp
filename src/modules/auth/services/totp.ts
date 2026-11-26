import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * #603 — TOTP second factor (RFC 6238 over RFC 4226 HOTP: HMAC-SHA1, 6 digits, 30 s steps).
 * Pure helpers only; the database side (encrypted secret, replay guard, recovery codes) is in `two-factor.ts`.
 */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Accepted clock drift: the previous, current and next step. */
export const TOTP_WINDOW = 1;
export const TOTP_ISSUER = "Verein ERP";
export const RECOVERY_CODE_COUNT = 10;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** Decodes RFC 4648 base32 (case-insensitive; spaces, dashes and padding ignored). Null on invalid input. */
export function base32Decode(input: string): Buffer | null {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  if (!clean || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh 160-bit secret (the RFC 4226 recommended length), base32-encoded for authenticator apps. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP with dynamic truncation. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totpStep(now: Date): number {
  return Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS);
}

function sameCode(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checks a code against the steps `now ± TOTP_WINDOW`. Returns the matching step, or null. A step at or before
 * `lastUsedStep` is never accepted (replay protection: each code works once, and never an older one after it).
 */
export function matchTotpStep(secretBase32: string, code: string, now: Date, lastUsedStep: number | null): number | null {
  const secret = base32Decode(secretBase32);
  const normalized = code.replace(/\s/g, "");
  if (!secret || !/^\d{6}$/.test(normalized)) return null;
  const current = totpStep(now);
  let matched: number | null = null;
  for (let step = current - TOTP_WINDOW; step <= current + TOTP_WINDOW; step += 1) {
    // Every candidate is compared (no early exit), so timing does not reveal which step matched.
    if (sameCode(hotp(secret, step), normalized) && (lastUsedStep === null || step > lastUsedStep)) matched ??= step;
  }
  return matched;
}

/** otpauth:// URI understood by authenticator apps (shown as a QR code and as a manual key). */
export function otpauthUri(input: { secret: string; account: string; issuer?: string }): string {
  const issuer = input.issuer ?? TOTP_ISSUER;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(input.account)}`;
  const params = new URLSearchParams({ secret: input.secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Groups a base32 key in blocks of four for manual entry. */
export function formatManualKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

// ── Recovery codes ──

/** Ten one-time codes like `K7QM-2XRA` (40 bits each, unambiguous base32 alphabet). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(5));
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

/** Case, spaces and dashes do not matter when a recovery code is typed. Null if it cannot be one. */
export function normalizeRecoveryCode(input: string): string | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z2-7]{8}$/.test(clean) ? clean : null;
}

export function hashRecoveryCode(normalized: string): string {
  return createHash("sha256").update(`verein-erp:totp-recovery:${normalized}`).digest("hex");
}

// ── Session re-issue ticket ──

/**
 * The password change and "sign out other devices" re-issue the current device's cookie through the credentials
 * provider. With 2FA on, that sign-in would ask for a code again although this session already passed it. The
 * server mints a short-lived ticket (HMAC with AUTH_SECRET, bound to the user) that replaces the second factor —
 * never the password — for that one internal sign-in. It never leaves the server.
 */
const REISSUE_TTL_MS = 60 * 1000;

function reissueMac(secret: string, userId: string, expires: number): string {
  return createHmac("sha256", `verein-erp:auth-reissue:${secret}`).update(`${userId}.${expires}`).digest("base64url");
}

export function createReissueTicket(userId: string, secret: string, now = new Date()): string {
  const expires = now.getTime() + REISSUE_TTL_MS;
  return `${expires}.${reissueMac(secret, userId, expires)}`;
}

export function isReissueTicketValid(ticket: unknown, userId: string, secret: string, now = new Date()): boolean {
  if (typeof ticket !== "string" || ticket.length > 200) return false;
  const [expiresRaw, mac, extra] = ticket.split(".");
  const expires = Number(expiresRaw);
  if (!mac || extra !== undefined || !Number.isSafeInteger(expires) || expires < now.getTime() || expires > now.getTime() + REISSUE_TTL_MS) return false;
  return sameCode(mac, reissueMac(secret, userId, expires));
}
