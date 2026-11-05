export const EXECUTION_LEASE_DURATION_MS = 45_000;
export const EXECUTION_HEARTBEAT_INTERVAL_MS = 10_000;

export function getExecutionLeaseExpiry(now: Date): Date {
  return new Date(now.getTime() + EXECUTION_LEASE_DURATION_MS);
}

export function isExecutionAttemptExhausted(attempt: number, maxAttempts: number): boolean {
  return attempt >= maxAttempts;
}
