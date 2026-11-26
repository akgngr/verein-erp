import "server-only";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { CredentialsSignin } from "next-auth";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { hasActiveExternalGrant, isTimeBoxedRole } from "@/shared/security/external-grant";
import { hashPassword, verifyPassword } from "@/shared/security/password";
import { getLoginAccessStatus, getLoginFailureState } from "@/shared/security/login-lockout";
import { consumeRateLimit, hashRateLimitSubject } from "@/shared/security/rate-limit";
import { buildUserLabel } from "@/shared/utils";

import { loginSchema } from "../schemas/login";
import { computeSessionVersion } from "./session-version";

/** Genel hata: hangi bilginin yanlış olduğu veya hesabın varlığı belli edilmez. */
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** Hesap geçici olarak kilitlendi (geriye dönük ihracat korunur; istemciye genel hata döner). */
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

/** IP tabanlı hız sınırı aşıldı. */
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

const LOGIN_IP_RATE_LIMIT = {
  limit: 30,
  windowMs: 15 * 60 * 1000,
  backoffMs: 15 * 60 * 1000,
} as const;

let dummyHashPromise: Promise<string> | null = null;
function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString("hex"));
  return dummyHashPromise;
}

async function getRequestClientIp(): Promise<string | null> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = headerStore.get("x-real-ip")?.trim();
    return forwarded || realIp || null;
  } catch {
    return null;
  }
}

/**
 * Credentials provider authorize akışı (IP hız sınırı, sabit zamanlı doğrulama ve kilitleme dahil).
 * Her sonuç writeAudit ile denetim kaydına yazılır (LOGIN_SUCCESS / LOGIN_FAILED).
 */
export async function authorize(
  credentials: Partial<Record<string, unknown>> | undefined,
): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  sessionVersion: string;
}> {
  const env = getEnv();

  const parsed = loginSchema.safeParse(credentials ?? {});
  if (!parsed.success) throw new InvalidCredentialsError();

  const now = new Date();
  const clientIp = await getRequestClientIp();
  if (clientIp) {
    const ipLimit = await consumeRateLimit(
      `login:ip:${hashRateLimitSubject(clientIp)}`,
      LOGIN_IP_RATE_LIMIT,
      now,
    );
    if (!ipLimit.allowed) {
      await writeAudit({
        action: "LOGIN_FAILED",
        entity: "Auth",
        userLabel: parsed.data.email.toLowerCase(),
        after: { reason: "ip_rate_limited" },
      });
      throw new RateLimitedError();
    }
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // Zamanlama farkıyla hesap varlığını ele vermemek için eşdeğer maliyetli sahte doğrulama.
    await verifyPassword(parsed.data.password, await getDummyPasswordHash());
    await writeAudit({ action: "LOGIN_FAILED", entity: "Auth", userLabel: email });
    throw new InvalidCredentialsError();
  }

  const accessStatus = getLoginAccessStatus(user.isActive, user.lockedUntil, now);

  if (accessStatus === "inactive") {
    await verifyPassword(parsed.data.password, await getDummyPasswordHash());
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "LOGIN_FAILED",
      entity: "Auth",
      entityId: user.id,
    });
    throw new InvalidCredentialsError();
  }

  const userLabel = buildUserLabel(user.name, user.email);

  if (accessStatus === "locked") {
    await verifyPassword(parsed.data.password, await getDummyPasswordHash());
    await writeAudit({
      userId: user.id,
      userLabel,
      action: "LOGIN_FAILED",
      entity: "Auth",
      entityId: user.id,
      after: { reason: "account_locked" },
    });
    // Dış kullanıcıya tek tip hata: hesabın varlığı ve kilit durumu dışarıya sızdırılmaz.
    throw new InvalidCredentialsError();
  }

  const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    // KARAR: Kilit süresi dolmuşsa hata sayacı sıfırdan başlar;
    // 5. ardışık hata hesabı 15 dakika boyunca kilitler.
    const lockout = getLoginFailureState(user.failedLoginCount, user.lockedUntil, now);

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lockout.failedLoginCount,
        lockedUntil: lockout.lockedUntil,
      },
    });

    await writeAudit({
      userId: user.id,
      userLabel,
      action: "LOGIN_FAILED",
      entity: "Auth",
      entityId: user.id,
    });

    throw new InvalidCredentialsError();
  }

  if (isTimeBoxedRole(user.role)) {
    const grants = await db.externalAccessGrant.findMany({ where: { userId: user.id } });
    if (!hasActiveExternalGrant(grants, now)) {
      await writeAudit({
        userId: user.id,
        userLabel,
        action: "LOGIN_FAILED",
        entity: "Auth",
        entityId: user.id,
      });
      throw new InvalidCredentialsError();
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });

  await writeAudit({
    userId: user.id,
    userLabel,
    action: "LOGIN_SUCCESS",
    entity: "Auth",
    entityId: user.id,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    sessionVersion: computeSessionVersion(user.passwordHash, env.AUTH_SECRET, user.sessionEpoch),
  };
}
