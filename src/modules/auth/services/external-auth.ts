import "server-only";

import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { hasActiveExternalGrant, isTimeBoxedRole } from "@/shared/security/external-grant";
import { getLoginAccessStatus } from "@/shared/security/login-lockout";
import { computeSessionVersion } from "./session-version";

export async function resolveExternalIdentity(userId: string) {
  const db = getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  const now = new Date();
  if (!user || getLoginAccessStatus(user.isActive, user.lockedUntil, now) !== "allowed") return null;
  if (isTimeBoxedRole(user.role)) {
    const grants = await db.externalAccessGrant.findMany({ where: { userId } });
    if (!hasActiveExternalGrant(grants, now)) return null;
  }
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    mustChangePassword: user.mustChangePassword,
    sessionVersion: computeSessionVersion(user.passwordHash, getEnv().AUTH_SECRET),
  };
}
