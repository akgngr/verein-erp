import "server-only";

import { loadEnvConfig } from "@next/env";
import { PgBoss } from "pg-boss";

import { getEnv } from "@/shared/env";
import { getAutomationRuntimeConfig } from "../runtime-config";
import { runAutomationOutboxDispatcher } from "../services/outbox-dispatcher";
import { executeAutomationTask } from "../services/task-worker";
import { automationTaskQueuePayloadSchema, AUTOMATION_TASK_QUEUE } from "./queue";

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  return error instanceof Error ? error.name.slice(0, 80) : "WORKER_FAILED";
}

export async function runAutomationWorker(): Promise<void> {
  loadEnvConfig(process.cwd());

  const runtime = getAutomationRuntimeConfig();
  if (!runtime.workerEnabled) {
    console.info("[automation:worker] Kapalı; AUTOMATION_ENABLED ve AUTOMATION_WORKER_ENABLED=true olmalı.");
    return;
  }

  const env = getEnv();
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: "pgboss",
    application_name: "verein-automation-worker",
    max: 5,
    schedule: false,
  });

  boss.on("error", (error) => {
    console.error("[automation:worker] pg-boss hata:", errorCode(error));
  });

  await boss.start({ attempts: 10 });
  await boss.createQueue(AUTOMATION_TASK_QUEUE, {
    retryLimit: 2,
    retryDelay: 600,
    retryDelayMax: 60 * 60,
    retryBackoff: true,
    expireInSeconds: 60 * 60,
    heartbeatSeconds: 60,
    deleteAfterSeconds: 60 * 60 * 24 * 7,
  });

  await boss.work(AUTOMATION_TASK_QUEUE, { batchSize: 1, localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      const parsed = automationTaskQueuePayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        console.error("[automation:worker] Geçersiz kuyruk mesajı; görev atlandı.");
        continue;
      }
      await executeAutomationTask(parsed.data);
    }
  });

  const dispatcherAbort = new AbortController();
  const dispatcher = runAutomationOutboxDispatcher(boss, dispatcherAbort.signal);

  console.info("[automation:worker] Çalışıyor; kuyruk:", AUTOMATION_TASK_QUEUE);

  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });

  console.info("[automation:worker] Kapatılıyor...");
  dispatcherAbort.abort();
  await boss.stop({ graceful: true, timeout: 30 });
  await dispatcher;
  console.info("[automation:worker] Güvenli şekilde durduruldu.");
}

runAutomationWorker().catch((error) => {
  console.error("[automation:worker] Başlatılamadı:", errorCode(error));
  process.exitCode = 1;
});
