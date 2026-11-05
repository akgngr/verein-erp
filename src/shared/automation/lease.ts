export const EXECUTION_LEASE_DURATION_MS = 45_000;
export const EXECUTION_HEARTBEAT_INTERVAL_MS = 10_000;
export const LEGACY_EXECUTION_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export function getExecutionLeaseExpiry(now: Date): Date {
  return new Date(now.getTime() + EXECUTION_LEASE_DURATION_MS);
}

export function getLegacyExecutionStaleBefore(now: Date): Date {
  return new Date(now.getTime() - LEGACY_EXECUTION_STALE_AFTER_MS);
}

export function isExecutionAttemptExhausted(attempt: number, maxAttempts: number): boolean {
  return attempt >= maxAttempts;
}

 
export const PENDING_EXECUTION_RECOVERY_AFTER_MS = 2 * 60 * 1000;
export const PENDING_EXECUTION_RECOVERY_INTERVAL_MS = 60 * 1000;

export function getPendingExecutionRecoveryBefore(now: Date): Date {
  return new Date(now.getTime() - PENDING_EXECUTION_RECOVERY_AFTER_MS);
}

/** One recovery outbox event per execution/attempt and minute bucket. */
export function getPendingRecoveryEventKey(
  executionId: string,
  attempt: number,
  now: Date,
): string {
  const bucket = Math.floor(now.getTime() / PENDING_EXECUTION_RECOVERY_INTERVAL_MS);
  return `automation.task.pending-recovery:${executionId}:${attempt}:${bucket}`;
}
