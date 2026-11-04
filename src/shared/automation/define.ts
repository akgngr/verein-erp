import type { z } from "zod";

/**
 * Queue-independent task contract.
 *
 * Tasks are defined only in trusted application code. User input is never
 * treated as a handler, import path, or executable code.
 */
export type TaskRetryPolicy = {
  /** Total attempts, including the first execution. */
  maxAttempts: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  /** pg-boss supports constant delay (1) or exponential doubling (2). */
  backoffMultiplier: 1 | 2;
};

export type TaskExecutionContext = {
  executionId: string;
  taskRunId: string;
  requestedById: string | null;
  organizationId: string;
  correlationId: string;
  locale: "tr" | "de";
  attempt: number;
  signal: AbortSignal;
};

export type TaskDefinition<TSchema extends z.ZodType = z.ZodType, TResult = unknown> = {
  /** Stable namespaced key (e.g. "mailings.send_campaign"). */
  key: `${string}.${string}`;
  /** Increment when a breaking input/output contract change is made. */
  version: number;
  /** Short description for the administration UI. */
  description: string;
  /** Queue JSON is validated against this schema before reaching the handler. */
  inputSchema: TSchema;
  timeoutSeconds?: number;
  retry?: Partial<TaskRetryPolicy>;
  /** Stable, PII-free key preventing duplicate logical work. */
  idempotencyKey?: (input: z.output<TSchema>) => string;
  /** Trusted application handler registered statically. */
  handler: (input: z.output<TSchema>, context: TaskExecutionContext) => Promise<TResult>;
};

export const DEFAULT_TASK_RETRY_POLICY: TaskRetryPolicy = Object.freeze({
  maxAttempts: 3,
  initialDelaySeconds: 30,
  maxDelaySeconds: 30 * 60,
  backoffMultiplier: 2,
});

/**
 * Normalize retry settings once, then persist and pass the same policy to the
 * queue transport. pg-boss supports constant or exponential (x2) backoff;
 * reject other multipliers rather than silently running a different policy.
 */
export function resolveTaskRetryPolicy(
  retry?: Partial<TaskRetryPolicy>,
): TaskRetryPolicy {
  const policy: TaskRetryPolicy = {
    ...DEFAULT_TASK_RETRY_POLICY,
    ...retry,
  };

  if (!Number.isSafeInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 100) {
    throw new Error("TASK_RETRY_MAX_ATTEMPTS_INVALID");
  }
  if (!Number.isSafeInteger(policy.initialDelaySeconds) ||
      policy.initialDelaySeconds < 0 || policy.initialDelaySeconds > 24 * 60 * 60) {
    throw new Error("TASK_RETRY_INITIAL_DELAY_INVALID");
  }
  if (!Number.isSafeInteger(policy.maxDelaySeconds) ||
      policy.maxDelaySeconds < policy.initialDelaySeconds || policy.maxDelaySeconds > 7 * 24 * 60 * 60) {
    throw new Error("TASK_RETRY_MAX_DELAY_INVALID");
  }
  if (policy.backoffMultiplier !== 1 && policy.backoffMultiplier !== 2) {
    throw new Error("TASK_RETRY_BACKOFF_UNSUPPORTED");
  }

  return Object.freeze(policy);
}

const TASK_KEY = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$/;

export function defineTask<TSchema extends z.ZodType, TResult>(
  definition: TaskDefinition<TSchema, TResult>,
): TaskDefinition<TSchema, TResult> {
  if (!TASK_KEY.test(definition.key)) {
    throw new Error(`Geçersiz görev anahtarı: ${definition.key}`);
  }
  if (!Number.isSafeInteger(definition.version) || definition.version < 1) {
    throw new Error(`Görev sürümü pozitif bir tam sayı olmalı: ${definition.key}`);
  }
  if (definition.timeoutSeconds !== undefined &&
      (!Number.isSafeInteger(definition.timeoutSeconds) || definition.timeoutSeconds < 1)) {
    throw new Error(`Görev zaman aşımı pozitif bir tam sayı olmalı: ${definition.key}`);
  }

  return Object.freeze({
    ...definition,
    retry: resolveTaskRetryPolicy(definition.retry),
  });
}
