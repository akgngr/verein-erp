import { createCipheriv, createHash, randomBytes } from "node:crypto";

function getEncryptionKey(): Buffer {
  const secret =
    process.env.PORTAL_ART15_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "verein-erp-dev-art15-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptArt15Payload(plainJson: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainJson, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}
