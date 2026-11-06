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
  /**
   * Optional: allow administrators to run this task on a recurring schedule.
   * The input is produced by trusted code for every slot; users only choose
   * the interval, never the payload.
   */
  schedule?: {
    input: (slot: { scheduleId: string; slotAt: Date }) => z.input<TSchema>;
    /** Lower bound for the interval chosen in the UI. Default 60 minutes. */
    minIntervalMinutes?: number;
  };
  /**
   * Optional: expose this task as a node in the visual workflow editor. Inputs
   * entered in the editor are validated against inputSchema at publish (when
   * static) and again when the worker claims the job.
   */
  workflow?: {
    /** Example/default input shown in the editor. */
    defaultInput?: Record<string, unknown>;
  };
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

/** Owning module key derived from the namespaced task key. */
export function taskModuleKey(taskKey: string): string {
  return taskKey.slice(0, taskKey.indexOf("."));
}

/** Runtime guard used by the generated registry to collect task exports. */
export function isTaskDefinition(value: unknown): value is TaskDefinition {
  return typeof value === "object" && value !== null &&
    "key" in value && "handler" in value && "inputSchema" in value && "version" in value;
}

/**
 * Domain event a module may emit (e.g. "members.created"). Payloads must carry
 * only identifiers and small, non-sensitive values; workflows triggered by the
 * event receive the validated payload as `trigger`.
 */
export type EventDefinition<TSchema extends z.ZodType = z.ZodType> = {
  kind: "automation.event";
  key: `${string}.${string}`;
  description: string;
  payloadSchema: TSchema;
  /**
   * Optional record fields usable as {{<namespace>.<field>}} in task texts
   * (e.g. {{member.fullName}}). Loaded by trusted module code only when a task
   * renders its text in the worker; values are never written to queue
   * payloads or execution records.
   */
  variables?: {
    namespace: string;
    fields: readonly string[];
    load: (payload: z.output<TSchema>) => Promise<Record<string, string | number | null>>;
  };
};

export function defineEvent<TSchema extends z.ZodType>(
  definition: Omit<EventDefinition<TSchema>, "kind">,
): EventDefinition<TSchema> {
  if (!TASK_KEY.test(definition.key)) {
    throw new Error(`Geçersiz olay anahtarı: ${definition.key}`);
  }
  return Object.freeze({ ...definition, kind: "automation.event" as const });
}

export function isEventDefinition(value: unknown): value is EventDefinition {
  return typeof value === "object" && value !== null &&
    (value as { kind?: unknown }).kind === "automation.event";
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

/**
 * Throw from a task handler when retrying cannot help (missing configuration,
 * invalid recipient). The execution fails immediately with this code.
 */
export class PermanentTaskError extends Error {
  readonly permanent = true;
  constructor(code: string) {
    super(code);
    this.name = "PermanentTaskError";
  }
}

export function isPermanentTaskError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { permanent?: unknown }).permanent === true;
}
