import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

import {
  generateOpaqueToken,
  hashPortalSecret,
  PORTAL_SESSION_ABSOLUTE_MS,
  PORTAL_STEP_UP_TTL_MS,
} from "./auth-core";

export const PORTAL_WEBAUTHN_POLICY = {
  userVerification: "required" as const,
  attestation: "none" as const,
};

export async function listPortalPasskeys(subjectRef: string) {
  return getDb().portalPasskey.findMany({
    where: { subjectRef },
    select: { id: true, credentialId: true, transports: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function registerPortalPasskey(params: {
  subjectRef: string;
  credentialId: string;
  publicKey: string;
  transports?: string | null;
}) {
  const created = await getDb().portalPasskey.create({
    data: {
      subjectRef: params.subjectRef,
      credentialId: params.credentialId,
      publicKey: params.publicKey,
      transports: params.transports ?? null,
    },
  });
  await writeAudit({
    action: "PORTAL_PASSKEY_ENROLLED",
    entity: "PortalPasskey",
    entityId: created.id,
    after: { subjectRef: params.subjectRef },
  });
  return created;
}

/**
 * Grants a 5-minute step-up window and rotates the portal session token
 * after passkey verification (`userVerification: required`).
 */
const PASSKEY_VERIFICATION_IMPLEMENTED = false as boolean;

export async function completePasskeyStepUp(params: {
  sessionId: string;
  subjectRef: string;
  credentialId: string;
  now?: Date;
}): Promise<{ ok: true; rawSessionToken: string } | { ok: false }> {
  // #580: WebAuthn imza/challenge doğrulaması uygulanana kadar KAPALI (fail closed). Önceki sürüm yalnız
  // kimlik bilgisinin var olduğuna bakıp ek doğrulama veriyordu. Ek doğrulama e-posta bağlantısıyladır
  // (auth.ts requestPortalStepUpLink).
  if (!PASSKEY_VERIFICATION_IMPLEMENTED) return { ok: false };
  const now = params.now ?? new Date();
  const db = getDb();
  const passkey = await db.portalPasskey.findUnique({ where: { credentialId: params.credentialId } });
  if (!passkey || passkey.subjectRef !== params.subjectRef) {
    return { ok: false };
  }

  const rawSessionToken = generateOpaqueToken(32);
  const sessionHash = hashPortalSecret(rawSessionToken);

  await db.$transaction(async (tx) => {
    await tx.portalSession.updateMany({
      where: { id: params.sessionId, subjectRef: params.subjectRef, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.portalSession.create({
      data: {
        sessionHash,
        subjectRef: params.subjectRef,
        stepUpUntil: new Date(now.getTime() + PORTAL_STEP_UP_TTL_MS),
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + PORTAL_SESSION_ABSOLUTE_MS),
      },
    });
  });

  await writeAudit({
    action: "PORTAL_STEP_UP_GRANTED",
    entity: "PortalSession",
    entityId: params.sessionId,
    after: { subjectRef: params.subjectRef, method: "passkey" },
  });

  return { ok: true, rawSessionToken };
}
