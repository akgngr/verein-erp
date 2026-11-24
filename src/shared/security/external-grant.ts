export const TIME_BOXED_ROLES = ["TAX_ADVISOR"] as const;
export const EXTERNAL_GRANT_DEFAULT_DAYS = 14;
export const EXTERNAL_GRANT_MAX_DAYS = 90;
export const EXTERNAL_GRANT_ALLOWED_MODULES = ["accounting", "finance", "compliance"] as const;

export type TimeBoxWindow = {
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ExternalGrantWindow = TimeBoxWindow & {
  moduleScope: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isTimeBoxedRole(role: string): boolean {
  return (TIME_BOXED_ROLES as readonly string[]).includes(role);
}

/**
 * Returns true only while a time-boxed window has started, has not expired,
 * and has not been revoked.
 */
export function isTimeBoxActive(window: TimeBoxWindow, now = new Date()): boolean {
  if (window.revokedAt !== null) return false;
  const nowMs = now.getTime();
  return window.startsAt.getTime() <= nowMs && window.expiresAt.getTime() > nowMs;
}

export function validateGrantWindow(
  startsAt: Date,
  expiresAt: Date,
): { ok: true } | { ok: false; reason: "endBeforeStart" | "exceedsMaxDuration" } {
  const durationMs = expiresAt.getTime() - startsAt.getTime();
  if (Number.isNaN(durationMs) || durationMs <= 0) {
    return { ok: false, reason: "endBeforeStart" };
  }
  if (durationMs > EXTERNAL_GRANT_MAX_DAYS * MS_PER_DAY) {
    return { ok: false, reason: "exceedsMaxDuration" };
  }
  return { ok: true };
}

export function computeDefaultGrantWindow(
  now = new Date(),
  days = EXTERNAL_GRANT_DEFAULT_DAYS,
): { startsAt: Date; expiresAt: Date } {
  const clampedDays = Math.max(1, Math.min(EXTERNAL_GRANT_MAX_DAYS, days));
  const startsAt = new Date(now.getTime());
  const expiresAt = new Date(now.getTime() + clampedDays * MS_PER_DAY);
  return { startsAt, expiresAt };
}

/**
 * Checks whether at least one grant is active at `now`.
 * If `moduleScope` is provided, the grant must either be unscoped (`moduleScope === null`)
 * or explicitly match `moduleScope`.
 */
export function hasActiveExternalGrant(
  grants: readonly ExternalGrantWindow[],
  now = new Date(),
  moduleScope?: string | null,
): boolean {
  return grants.some((grant) => {
    if (!isTimeBoxActive(grant, now)) return false;
    if (!moduleScope) return true;
    return grant.moduleScope === null || grant.moduleScope === moduleScope;
  });
}

/**
 * Enforces module-level scope for time-boxed external reviewers (e.g. TAX_ADVISOR).
 * Personal preferences (`settings`) remain accessible while any grant is active;
 * module resources require an active grant covering that module.
 */
export function canExternalReviewerAccessResource(
  role: string,
  grants: readonly ExternalGrantWindow[],
  resource: string,
  now = new Date(),
): boolean {
  if (!isTimeBoxedRole(role)) return true;
  if (resource === "settings") {
    return hasActiveExternalGrant(grants, now);
  }
  if (!(EXTERNAL_GRANT_ALLOWED_MODULES as readonly string[]).includes(resource)) {
    return false;
  }
  return hasActiveExternalGrant(grants, now, resource);
}
