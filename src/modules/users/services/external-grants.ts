import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import {
  EXTERNAL_GRANT_ALLOWED_MODULES,
  validateGrantWindow,
} from "@/shared/security/external-grant";

export async function listExternalGrantsForUser(userId: string) {
  return getDb().externalAccessGrant.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createExternalGrant(params: {
  userId: string;
  moduleScope?: string | null;
  startsAt: Date;
  expiresAt: Date;
  note?: string | null;
  actorUserId: string;
  actorUserLabel: string;
}) {
  const check = validateGrantWindow(params.startsAt, params.expiresAt);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const normalizedScope =
    params.moduleScope && (EXTERNAL_GRANT_ALLOWED_MODULES as readonly string[]).includes(params.moduleScope)
      ? params.moduleScope
      : null;

  const grant = await getDb().externalAccessGrant.create({
    data: {
      userId: params.userId,
      moduleScope: normalizedScope,
      startsAt: params.startsAt,
      expiresAt: params.expiresAt,
      note: params.note?.trim() || null,
      createdByUserId: params.actorUserId,
    },
  });

  await writeAudit({
    userId: params.actorUserId,
    userLabel: params.actorUserLabel,
    action: "CREATE",
    entity: "ExternalAccessGrant",
    entityId: grant.id,
    after: {
      userId: grant.userId,
      moduleScope: grant.moduleScope,
      startsAt: grant.startsAt.toISOString(),
      expiresAt: grant.expiresAt.toISOString(),
    },
  });

  return grant;
}

export async function revokeExternalGrant(params: {
  grantId: string;
  actorUserId: string;
  actorUserLabel: string;
}) {
  const db = getDb();
  const existing = await db.externalAccessGrant.findUnique({ where: { id: params.grantId } });
  if (!existing) throw new Error("notFound");
  if (existing.revokedAt) return existing;

  const updated = await db.externalAccessGrant.update({
    where: { id: params.grantId },
    data: { revokedAt: new Date() },
  });

  await writeAudit({
    userId: params.actorUserId,
    userLabel: params.actorUserLabel,
    action: "REVOKE",
    entity: "ExternalAccessGrant",
    entityId: updated.id,
    before: { revokedAt: null },
    after: { revokedAt: updated.revokedAt?.toISOString() ?? null },
  });

  return updated;
}
