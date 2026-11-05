import "server-only";

import { CredentialsSignin } from "next-auth";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { verifyPassword } from "@/shared/security/password";
import { getLoginAccessStatus, getLoginFailureState } from "@/shared/security/login-lockout";
import { buildUserLabel } from "@/shared/utils";

import { loginSchema } from "../schemas/login";

/** Genel hata: hangi bilginin yanlış olduğu belli edilmez. */
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** Hesap geçici olarak kilitlendi. */
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

/**
 * Credentials provider authorize akışı (kilitleme mantığı dahil).
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
}> {
  getEnv();

  const parsed = loginSchema.safeParse(credentials ?? {});
  if (!parsed.success) throw new InvalidCredentialsError();

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    await writeAudit({ action: "LOGIN_FAILED", entity: "Auth", userLabel: email });
    throw new InvalidCredentialsError();
  }

  const now = new Date();
  const accessStatus = getLoginAccessStatus(user.isActive, user.lockedUntil, now);

  if (accessStatus === "inactive") {
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "LOGIN_FAILED",
      entity: "Auth",
      entityId: user.id,
    });
    throw new InvalidCredentialsError();
  }  const now = new Date();
  const userLabel = buildUserLabel(user.name, user.email);

  if (accessStatus === "locked") {
    await writeAudit({
      userId: user.id,
      userLabel,
      action: "LOGIN_FAILED",
      entity: "Auth",
      entityId: user.id,
    });
    throw new AccountLockedError();
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
  };
}
