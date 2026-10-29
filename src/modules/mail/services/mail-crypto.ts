import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = "v1";
const IV_LENGTH = 12;

/**
 * Encryption key source for stored SMTP passwords. Uses the secret the app
 * already has for authentication, so operators do not need extra configuration.
 * `MAIL_ENCRYPTION_KEY` can optionally override it.
 */
function getSecret(): string | null {
  return (
    process.env.MAIL_ENCRYPTION_KEY ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    null
  );
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`verein-erp:mail:${secret}`).digest();
}

export function hasEncryptionKey(): boolean {
  return Boolean(getSecret());
}

/** Encrypts a secret as `v1:<iv>:<tag>:<ciphertext>` (base64 parts). */
export function encryptSecret(plainText: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("Encryption key is not available");

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [FORMAT_VERSION, iv, tag, encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64")))
    .join(":");
}

/** Returns the decrypted secret, or null when the key is missing/changed or data is corrupt. */
export function decryptSecret(payload: string): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const [version, iv, tag, encrypted] = payload.split(":");
  if (version !== FORMAT_VERSION || !iv || !tag || !encrypted) return null;

  try {
    const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
