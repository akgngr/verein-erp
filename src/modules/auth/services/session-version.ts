import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Parola özeti üzerinden belirlenimci oturum sürümü üretir (şema değişikliği gerektirmez).
 * Kullanıcı parolasını değiştirdiğinde veya yönetici parolayı sıfırladığında hash değişir;
 * böylece diğer tüm cihazlardaki eski JWT oturumları anında geçersiz olur.
 */
export function computeSessionVersion(passwordHash: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("verein-session-v1:")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 24);
}

export function isSessionVersionValid(
  tokenVersion: string | undefined,
  passwordHash: string,
  secret: string,
): boolean {
  if (!tokenVersion) return false;
  const expected = computeSessionVersion(passwordHash, secret);
  const a = Buffer.from(tokenVersion, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
