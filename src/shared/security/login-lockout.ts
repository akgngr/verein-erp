export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export type LoginFailureState = {
  failedLoginCount: number;
  lockedUntil: Date | null;
  shouldLock: boolean;
};

/** Pure lockout policy shared by authentication and its unit tests. */
export function getLoginFailureState(
  failedLoginCount: number,
  lockedUntil: Date | null,
  now: Date,
): LoginFailureState {
  const expiredLock = Boolean(lockedUntil && lockedUntil <= now);
  const nextFailedCount = (expiredLock ? 0 : failedLoginCount) + 1;
  const shouldLock = nextFailedCount >= MAX_FAILED_ATTEMPTS;

  return {
    failedLoginCount: shouldLock ? 0 : nextFailedCount,
    lockedUntil: shouldLock
      ? new Date(now.getTime() + LOCK_MINUTES * 60_000)
      : expiredLock
        ? null
        : lockedUntil,
    shouldLock,
  };
}
