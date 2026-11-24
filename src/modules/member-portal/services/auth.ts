import "server-only";

import { sendMail } from "@/modules/mail/server";
import { listMembers } from "@/modules/members/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { consumeRateLimit, hashRateLimitSubject, PORTAL_RATE_LIMITS } from "@/shared/security/rate-limit";

import {
  generateOpaqueToken,
  hashPortalSecret,
  isPortalSessionActive,
  isPortalTokenUsable,
  PORTAL_MAGIC_LINK_TTL_MS,
  PORTAL_MAX_SESSIONS_PER_SUBJECT,
  PORTAL_SESSION_ABSOLUTE_MS,
  PORTAL_STEP_UP_TTL_MS,
} from "./auth-core";

async function equalizeTiming(startedAtMs: number, minMs = 80): Promise<void> {
  const elapsed = Date.now() - startedAtMs;
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
  }
}

export async function requestPortalMagicLink(params: {
  email: string;
  ip: string;
  rawNonce: string;
  origin: string;
  purpose?: "login" | "stepup";
  locale?: "tr" | "de";
  now?: Date;
}): Promise<{ ok: true; rateLimited?: boolean }> {
  const startedAt = Date.now();
  const now = params.now ?? new Date();
  const normalizedEmail = params.email.trim().toLowerCase();
  const addressHash = hashRateLimitSubject(normalizedEmail);
  const ipHash = hashRateLimitSubject(params.ip || "unknown");

  const [ipLimit, addrLimit] = await Promise.all([
    consumeRateLimit(`portal:ip:${ipHash}`, PORTAL_RATE_LIMITS.perIp, now),
    consumeRateLimit(`portal:addr:${addressHash}`, PORTAL_RATE_LIMITS.perAddressHash, now),
  ]);

  if (!ipLimit.allowed || !addrLimit.allowed) {
    await equalizeTiming(startedAt);
    return { ok: true, rateLimited: true };
  }

  const found = await listMembers({
    q: normalizedEmail,
    page: 1,
    pageSize: 10,
    skip: 0,
    take: 10,
    sort: "lastName",
    dir: "asc",
    filters: {},
  });

  const member = found.rows.find((m) => m.email?.trim().toLowerCase() === normalizedEmail);
  if (!member || !member.email) {
    await equalizeTiming(startedAt);
    return { ok: true };
  }

  const purpose = params.purpose ?? "login";
  const ttlMs = purpose === "stepup" ? PORTAL_STEP_UP_TTL_MS : PORTAL_MAGIC_LINK_TTL_MS;
  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashPortalSecret(rawToken);
  const nonceHash = hashPortalSecret(params.rawNonce);
  const expiresAt = new Date(now.getTime() + ttlMs);

  const tokenRecord = await getDb().portalLoginToken.create({
    data: {
      tokenHash,
      subjectRef: member.id,
      nonceHash,
      purpose,
      expiresAt,
    },
  });

  const confirmUrl = `${params.origin}/portal/onayla?token=${encodeURIComponent(rawToken)}`;
  const isDe = params.locale === "de";
  const subject = isDe ? "Ihr Anmeldelink für das Mitgliederportal" : "Üye portalı giriş bağlantınız";
  const text = isDe
    ? `Bitte bestätigen Sie Ihre Anmeldung über diesen Link (gültig für 15 Minuten, nur einmalig): ${confirmUrl}`
    : `Girişinizi onaylamak için bu bağlantıyı açın (15 dakika geçerli, tek kullanımlık): ${confirmUrl}`;

  await sendMail({
    to: member.email,
    subject,
    text,
    context: { module: "member-portal", reference: tokenRecord.id },
  });

  await writeAudit({
    action: "PORTAL_MAGIC_LINK_ISSUED",
    entity: "PortalLoginToken",
    entityId: tokenRecord.id,
    after: { subjectRef: member.id, purpose },
  });

  await equalizeTiming(startedAt);
  return { ok: true };
}

export async function consumePortalMagicLinkPost(params: {
  rawToken: string;
  rawNonce: string;
  ip: string;
  now?: Date;
}): Promise<
  | { ok: true; rawSessionToken: string; subjectRef: string; purpose: string }
  | { ok: false; reason: "rate_limited" | "invalid_or_expired" }
> {
  const now = params.now ?? new Date();
  const ipHash = hashRateLimitSubject(params.ip || "unknown");
  const tokenHash = hashPortalSecret(params.rawToken);
  const nonceHash = hashPortalSecret(params.rawNonce);
  const db = getDb();

  const existing = await db.portalLoginToken.findUnique({ where: { tokenHash } });
  if (!existing || !isPortalTokenUsable(existing, nonceHash, now)) {
    const wrongLimit = await consumeRateLimit(`portal:wrong:${ipHash}`, PORTAL_RATE_LIMITS.wrongToken, now);
    return { ok: false, reason: wrongLimit.allowed ? "invalid_or_expired" : "rate_limited" };
  }

  // Atomic single-use claim: concurrent POSTs only succeed for one caller.
  const claimed = await db.portalLoginToken.updateMany({
    where: {
      id: existing.id,
      usedAt: null,
      expiresAt: { gt: now },
      nonceHash,
    },
    data: { usedAt: now },
  });

  if (claimed.count !== 1) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const rawSessionToken = generateOpaqueToken(32);
  const sessionHash = hashPortalSecret(rawSessionToken);
  const expiresAt = new Date(now.getTime() + PORTAL_SESSION_ABSOLUTE_MS);
  const stepUpUntil =
    existing.purpose === "stepup" ? new Date(now.getTime() + PORTAL_STEP_UP_TTL_MS) : null;

  await db.$transaction(async (tx) => {
    const active = await tx.portalSession.findMany({
      where: { subjectRef: existing.subjectRef, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "asc" },
    });
    if (active.length >= PORTAL_MAX_SESSIONS_PER_SUBJECT) {
      const toRevoke = active.slice(0, active.length - PORTAL_MAX_SESSIONS_PER_SUBJECT + 1);
      await tx.portalSession.updateMany({
        where: { id: { in: toRevoke.map((s) => s.id) } },
        data: { revokedAt: now },
      });
    }
    await tx.portalSession.create({
      data: {
        sessionHash,
        subjectRef: existing.subjectRef,
        stepUpUntil,
        lastSeenAt: now,
        expiresAt,
      },
    });
  });

  await writeAudit({
    action: "PORTAL_SESSION_CREATED",
    entity: "PortalSession",
    entityId: existing.id,
    after: { subjectRef: existing.subjectRef, purpose: existing.purpose },
  });

  return { ok: true, rawSessionToken, subjectRef: existing.subjectRef, purpose: existing.purpose };
}

export async function getActivePortalSession(rawSessionToken: string | undefined, now = new Date()) {
  if (!rawSessionToken) return null;
  const sessionHash = hashPortalSecret(rawSessionToken);
  const db = getDb();
  const session = await db.portalSession.findUnique({ where: { sessionHash } });
  if (!session || !isPortalSessionActive(session, now)) return null;

  await db.portalSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });
  return session;
}

export async function signOutEverywhere(subjectRef: string, now = new Date()): Promise<void> {
  await getDb().portalSession.updateMany({
    where: { subjectRef, revokedAt: null },
    data: { revokedAt: now },
  });
  await writeAudit({
    action: "PORTAL_SIGN_OUT_EVERYWHERE",
    entity: "PortalSession",
    entityId: subjectRef,
    after: { subjectRef },
  });
}
