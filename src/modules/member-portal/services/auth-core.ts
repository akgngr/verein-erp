import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PORTAL_NONCE_COOKIE = "__Host-portal-nonce";
export const PORTAL_SESSION_COOKIE = "__Host-portal-session";

export const PORTAL_MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const PORTAL_STEP_UP_TTL_MS = 5 * 60 * 1000;
export const PORTAL_SESSION_IDLE_MS = 15 * 60 * 1000;
export const PORTAL_SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const PORTAL_MAX_SESSIONS_PER_SUBJECT = 3;

export function isPortalEnabled(): boolean {
  return process.env.PORTAL_ENABLED === "true";
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashPortalSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export type PortalTokenRecord = {
  tokenHash: string;
  nonceHash: string;
  purpose: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export function isPortalTokenUsable(
  record: PortalTokenRecord,
  nonceHash: string,
  now = new Date(),
): boolean {
  if (record.usedAt !== null) return false;
  if (record.expiresAt.getTime() <= now.getTime()) return false;
  return safeEqualHex(record.nonceHash, nonceHash);
}

export type PortalSessionRecord = {
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  stepUpUntil: Date | null;
};

export function isPortalSessionActive(session: PortalSessionRecord, now = new Date()): boolean {
  if (session.revokedAt !== null) return false;
  const nowMs = now.getTime();
  if (session.expiresAt.getTime() <= nowMs) return false;
  if (nowMs - session.lastSeenAt.getTime() >= PORTAL_SESSION_IDLE_MS) return false;
  return true;
}

export function isPortalStepUpActive(session: PortalSessionRecord, now = new Date()): boolean {
  if (!isPortalSessionActive(session, now)) return false;
  return session.stepUpUntil !== null && session.stepUpUntil.getTime() > now.getTime();
}

export function maskIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const clean = iban.replace(/\s+/g, "");
  if (clean.length < 8) return "••••";
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}
