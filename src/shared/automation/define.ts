import type { z } from "zod";

/**
 * Queue bağımsız görev sözleşmesi.
 *
 * Görevler yalnızca güvenilir uygulama kodunda tanımlanır. Kullanıcı girdisi hiçbir zaman
 * handler, import yolu veya çalıştırılabilir kod olarak kabul edilmez.
 */
export type TaskRetryPolicy = {
  /** İlk denemeyi de içeren toplam deneme sayısı. */
  maxAttempts: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  backoffMultiplier: number;
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
  /** Modül ad alanlı, kararlı anahtar (örn. "mailings.send_campaign"). */
  key: `${string}.${string}`;
  /** Aynı görev anahtarının geriye uyumsuz girdi/çıktı değişikliklerinde artırılır. */
  version: number;
  /** Yönetim arayüzünde gösterilecek kısa açıklama. */
  description: string;
  /** Kuyruktan gelen JSON veri, handler'a ulaşmadan önce bu şemayla doğrulanır. */
  inputSchema: TSchema;
  timeoutSeconds?: number;
  retry?: Partial<TaskRetryPolicy>;
  /** Aynı mantıksal işin yinelenmesini önleyen, PII içermeyen kararlı anahtar. */
  idempotencyKey?: (input: z.output<TSchema>) => string;
  /** Yalnızca statik olarak kayıtlı, güvenilir uygulama handler'ı. */
  handler: (input: z.output<TSchema>, context: TaskExecutionContext) => Promise<TResult>;
};

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
  return Object.freeze(definition);
}

export type AnyTaskDefinition = TaskDefinition<z.ZodType, unknown>;
