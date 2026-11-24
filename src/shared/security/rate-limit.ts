import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/shared/db";

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
  backoffMs?: number;
};

export type RateLimitState = {
  count: number;
  windowStart: Date;
  lockedUntil: Date | null;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  nextState: RateLimitState;
};

export const PORTAL_RATE_LIMITS = {
  perAddressHash: { limit: 3, windowMs: 15 * 60 * 1000 },
  perIp: { limit: 20, windowMs: 60 * 60 * 1000 },
  wrongToken: { limit: 5, windowMs: 15 * 60 * 1000, backoffMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export function hashRateLimitSubject(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Pure rate-limit evaluator (testable with a frozen clock). */
export function evaluateRateLimit(
  current: RateLimitState | null,
  config: RateLimitConfig,
  now = new Date(),
): RateLimitResult {
  const nowMs = now.getTime();

  if (current?.lockedUntil && current.lockedUntil.getTime() > nowMs) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.lockedUntil.getTime() - nowMs) / 1000),
      nextState: current,
    };
  }

  const windowExpired = !current || nowMs - current.windowStart.getTime() >= config.windowMs;
  const count = windowExpired ? 1 : current.count + 1;
  const windowStart = windowExpired ? now : current.windowStart;

  if (count > config.limit) {
    const lockedUntil = config.backoffMs ? new Date(nowMs + config.backoffMs) : null;
    const retryMs = lockedUntil
      ? lockedUntil.getTime() - nowMs
      : Math.max(1000, windowStart.getTime() + config.windowMs - nowMs);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryMs / 1000),
      nextState: { count, windowStart, lockedUntil },
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - count),
    retryAfterSeconds: 0,
    nextState: { count, windowStart, lockedUntil: null },
  };
}

/** Postgres-backed shared rate limiter (ADR 0010, no Redis required). */
export async function consumeRateLimit(
  key: string,
  config: RateLimitConfig,
  now = new Date(),
): Promise<RateLimitResult> {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const existing = await tx.securityRateLimit.findUnique({ where: { key } });
    const res = evaluateRateLimit(
      existing
        ? { count: existing.count, windowStart: existing.windowStart, lockedUntil: existing.lockedUntil }
        : null,
      config,
      now,
    );

    await tx.securityRateLimit.upsert({
      where: { key },
      create: {
        key,
        count: res.nextState.count,
        windowStart: res.nextState.windowStart,
        lockedUntil: res.nextState.lockedUntil,
      },
      update: {
        count: res.nextState.count,
        windowStart: res.nextState.windowStart,
        lockedUntil: res.nextState.lockedUntil,
      },
    });

    return res;
  });
}
