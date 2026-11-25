import "server-only";

import { sendMail } from "@/modules/mail/server";
import { findMemberIdsByEmail, getMember } from "@/modules/members/server";
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
import { memberSubjectRef, normalizeSubjectRef, parseSubjectRef } from "./subject-ref";

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
  /** #580: Ek doğrulamada bağlantı oturumun kendi üyesine bağlanır (aynı e-postayı paylaşan başka üyeye değil). */
  memberId?: string;
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

  // #580: Tam e-posta eşleşmesi (büyük/küçük harf duyarsız, silinmemiş üye). Önceden sayfalı bulanık arama
  // ilk 10 sonuç içinde arıyordu. Aynı e-postayı paylaşan birden çok üye varsa (aile) ilk kayıt kullanılır.
  const [memberId] = params.memberId ? [params.memberId] : await findMemberIdsByEmail(normalizedEmail);
  const member = memberId ? await getMember(memberId, "SECRETARY") : null;
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
      subjectRef: memberSubjectRef(member.id),
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
    after: { subjectRef: memberSubjectRef(member.id), purpose },
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
  // #580: Önceki sürümün öneksiz belirteçleri de "member:<id>" olarak oturuma yazılır.
  const subjectRef = normalizeSubjectRef(existing.subjectRef);
  if (!subjectRef) return { ok: false, reason: "invalid_or_expired" };

  await db.$transaction(async (tx) => {
    const active = await tx.portalSession.findMany({
      where: { subjectRef, revokedAt: null, expiresAt: { gt: now } },
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
        subjectRef,
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
    after: { subjectRef, purpose: existing.purpose },
  });

  return { ok: true, rawSessionToken, subjectRef, purpose: existing.purpose };
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
  // #580: Önceki sürümde açılmış öneksiz oturumlar da servislerin beklediği biçimde döner.
  return { ...session, subjectRef: normalizeSubjectRef(session.subjectRef) ?? session.subjectRef };
}

export async function signOutEverywhere(subjectRef: string, now = new Date()): Promise<void> {
  const parsed = parseSubjectRef(subjectRef);
  // Önekli ve (önceki sürümden kalma) öneksiz oturumlar birlikte kapatılır.
  const refs = parsed ? [`${parsed.kind}:${parsed.id}`, ...(parsed.kind === "member" ? [parsed.id] : [])] : [subjectRef];
  await getDb().portalSession.updateMany({
    where: { subjectRef: { in: refs }, revokedAt: null },
    data: { revokedAt: now },
  });
  await writeAudit({
    action: "PORTAL_SIGN_OUT_EVERYWHERE",
    entity: "PortalSession",
    entityId: subjectRef,
    after: { subjectRef },
  });
}

/**
 * #580: E-postayla ek doğrulama (step-up). Geçiş anahtarı doğrulaması henüz yok; oturumdaki üyenin kayıtlı
 * e-postasına "stepup" amaçlı tek kullanımlık bağlantı gönderilir. Bağlantı onaylanınca 5 dakikalık ek
 * doğrulamalı yeni oturum açılır (consumePortalMagicLink). Hız sınırları giriş bağlantısıyla aynıdır.
 */
export async function requestPortalStepUpLink(params: {
  subjectRef: string;
  ip: string;
  rawNonce: string;
  origin: string;
  locale?: "tr" | "de";
}): Promise<{ ok: boolean; rateLimited?: boolean }> {
  const parsed = parseSubjectRef(params.subjectRef);
  if (!parsed || parsed.kind !== "member") return { ok: false };
  const member = await getMember(parsed.id, "SECRETARY");
  if (!member?.email) return { ok: false };
  return requestPortalMagicLink({
    email: member.email,
    ip: params.ip,
    rawNonce: params.rawNonce,
    origin: params.origin,
    purpose: "stepup",
    locale: params.locale,
    memberId: parsed.id,
  });
}
