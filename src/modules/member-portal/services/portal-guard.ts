import "server-only";

import type { NextResponse } from "next/server";

import { consumeRateLimit, hashRateLimitSubject, type RateLimitConfig } from "@/shared/security/rate-limit";

/**
 * #580: Oturumlu portal uçları için kişi ve işlem başına hız sınırı (rıza, düzeltme, Art. 15, etkinlik, imza,
 * makbuz). Önceden yalnız giriş bağlantısı sınırlıydı.
 */
export const PORTAL_ACTION_LIMIT: RateLimitConfig = { limit: 30, windowMs: 10 * 60 * 1000 };

export async function isPortalActionLimited(action: string, subjectRef: string, now = new Date()): Promise<boolean> {
  const result = await consumeRateLimit(`portal:action:${action}:${hashRateLimitSubject(subjectRef)}`, PORTAL_ACTION_LIMIT, now);
  return !result.allowed;
}

/**
 * #580: `__Host-` önekli çerezler yalnız `Secure` ve `Path=/` ile silinebilir; `cookies.delete(ad)` bu
 * öznitelikleri koymadığı için tarayıcı silmeyi yok sayıyordu.
 */
export function clearHostCookie(res: NextResponse, name: string): void {
  res.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0) });
}
