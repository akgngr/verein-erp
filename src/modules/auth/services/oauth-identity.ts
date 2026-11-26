import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { hasActiveExternalGrant, isTimeBoxedRole } from "@/shared/security/external-grant";
import { getLoginAccessStatus } from "@/shared/security/login-lockout";
import { buildUserLabel } from "@/shared/utils";

import { computeSessionVersion } from "./session-version";
import { isTwoFactorEnabled } from "./two-factor";

/**
 * #612: Dış sağlayıcıyla giriş → iç ERP kimliği eşlemesi.
 *
 * KARAR (güvenlik):
 * - Yalnız açıkça bağlanmış (provider, subject) çifti kabul edilir. E-posta ile eşleme YOK, kullanıcı otomatik
 *   oluşturulmaz. Sağlayıcının döndürdüğü ad/e-posta/resim oturuma hiç taşınmaz; oturum iç kullanıcıdan kurulur.
 * - Parola girişindeki kurallar aynen geçerlidir: pasif/kilitli hesap reddedilir, zaman kutulu rol için etkin
 *   erişim izni gerekir, `mustChangePassword` ve oturum sürümü (parola + sessionEpoch) korunur; böylece
 *   "tüm cihazlardan çıkış" ve parola değişikliği OAuth oturumlarını da sonlandırır.
 * - İki adımlı doğrulaması açık hesap için sağlayıcıyla giriş KAPALIDIR (fail closed): ikinci adım sağlayıcı
 *   akışına bağlanana kadar bu hesaplar parola + kod ile girer.
 */

export type OAuthSignInRejection = "not_linked" | "inactive" | "locked" | "no_external_grant" | "two_factor_enabled";

export type OAuthUserSnapshot = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
  passwordHash: string;
  sessionEpoch: number;
};

/** Saf karar: bağlı kimliğin iç kullanıcısı giriş yapabilir mi? (DB'siz test edilir.) */
export function decideOAuthSignIn(input: {
  user: OAuthUserSnapshot | null;
  now: Date;
  hasActiveGrant: boolean;
  twoFactorEnabled: boolean;
}): { ok: true } | { ok: false; reason: OAuthSignInRejection } {
  const { user, now } = input;
  if (!user) return { ok: false, reason: "not_linked" };
  const access = getLoginAccessStatus(user.isActive, user.lockedUntil, now);
  if (access === "inactive") return { ok: false, reason: "inactive" };
  if (access === "locked") return { ok: false, reason: "locked" };
  if (isTimeBoxedRole(user.role) && !input.hasActiveGrant) return { ok: false, reason: "no_external_grant" };
  if (input.twoFactorEnabled) return { ok: false, reason: "two_factor_enabled" };
  return { ok: true };
}

export type OAuthSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  sessionVersion: string;
};

/**
 * Sağlayıcı geri dönüşünde çağrılır. Bağlı ve izinli iç kullanıcının oturum alanlarını, aksi halde ret nedenini
 * döner. Her sonuç denetim kaydına yazılır (sağlayıcı kimliği ve neden; token, e-posta veya profil verisi yok).
 */
export async function resolveOAuthSignIn(
  provider: string,
  subject: string,
  now = new Date(),
): Promise<{ ok: true; user: OAuthSessionUser } | { ok: false; reason: OAuthSignInRejection }> {
  const db = getDb();
  const identity = subject ? await db.authIdentity.findUnique({ where: { provider_subject: { provider, subject } } }) : null;
  const user = identity
    ? await db.user.findUnique({
        where: { id: identity.userId },
        select: { id: true, name: true, email: true, role: true, isActive: true, lockedUntil: true, mustChangePassword: true, passwordHash: true, sessionEpoch: true },
      })
    : null;
  const hasActiveGrant = user && isTimeBoxedRole(user.role)
    ? hasActiveExternalGrant(await db.externalAccessGrant.findMany({ where: { userId: user.id } }), now)
    : false;
  const twoFactorEnabled = user ? await isTwoFactorEnabled(user.id) : false;
  const decision = decideOAuthSignIn({ user, now, hasActiveGrant, twoFactorEnabled });

  if (!decision.ok || !user || !identity) {
    const reason = decision.ok ? "not_linked" : decision.reason;
    await writeAudit({
      ...(user ? { userId: user.id, userLabel: buildUserLabel(user.name, user.email), entityId: user.id } : { userLabel: `oauth:${provider}` }),
      action: "LOGIN_FAILED",
      entity: "Auth",
      after: { provider, reason },
    });
    return { ok: false, reason };
  }

  await db.$transaction([
    db.authIdentity.update({ where: { id: identity.id }, data: { lastUsedAt: now } }),
    db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now } }),
  ]);
  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "LOGIN_SUCCESS",
    entity: "Auth",
    entityId: user.id,
    after: { provider },
  });
  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      sessionVersion: computeSessionVersion(user.passwordHash, getEnv().AUTH_SECRET, user.sessionEpoch),
    },
  };
}

export class IdentityLinkError extends Error {}

/**
 * Bağlantı oluşturur. ÇAĞIRAN yetkiyi doğrulamış olmalıdır (kullanıcının kendisi, oturum açıkken sağlayıcıdan
 * dönen doğrulanmış subject ile; veya yönetici). Subject başka kullanıcıya bağlıysa reddedilir (devralma yok).
 */
export async function linkAuthIdentity(input: { provider: string; subject: string; userId: string; actorId: string }): Promise<void> {
  if (!input.provider || !input.subject || !input.userId) throw new IdentityLinkError("auth.oauth.errors.invalidLink");
  const db = getDb();
  const existing = await db.authIdentity.findUnique({ where: { provider_subject: { provider: input.provider, subject: input.subject } } });
  if (existing && existing.userId !== input.userId) throw new IdentityLinkError("auth.oauth.errors.alreadyLinked");
  if (!existing) {
    await db.authIdentity.create({ data: { provider: input.provider, subject: input.subject, userId: input.userId, linkedById: input.actorId } });
  }
  await writeAudit({ userId: input.actorId, action: "AUTH_IDENTITY_LINKED", entity: "User", entityId: input.userId, after: { provider: input.provider } });
}

/** Bağlantıyı kaldırır (kullanıcı veya yönetici). Bağlantı yoksa sessizce başarılıdır. */
export async function unlinkAuthIdentity(input: { provider: string; userId: string; actorId: string }): Promise<void> {
  const removed = await getDb().authIdentity.deleteMany({ where: { provider: input.provider, userId: input.userId } });
  if (removed.count > 0) {
    await writeAudit({ userId: input.actorId, action: "AUTH_IDENTITY_UNLINKED", entity: "User", entityId: input.userId, after: { provider: input.provider } });
  }
}

/** Kullanıcının bağlı sağlayıcıları (yalnız sağlayıcı kimliği ve tarih; subject dışarı verilmez). */
export async function listAuthIdentities(userId: string): Promise<{ provider: string; linkedAt: Date; lastUsedAt: Date | null }[]> {
  return getDb().authIdentity.findMany({ where: { userId }, select: { provider: true, linkedAt: true, lastUsedAt: true }, orderBy: { provider: "asc" } });
}
