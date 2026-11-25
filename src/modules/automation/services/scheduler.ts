import "server-only";

import type { Prisma } from "@prisma/client";

import { taskModuleKey } from "@/shared/automation/define";
import { getDb } from "@/shared/db";

import { automationTasks, findAutomationTask } from "../tasks/registry";
import { assertTaskModulesUsable } from "./execution-control";
import { defaultAutomationLocale } from "./automation-locale";
import { createTaskExecutionRecord } from "./execution-store";

const SCHEDULE_BATCH = 20;
export const DEFAULT_MIN_INTERVAL_MINUTES = 60;
export const MAX_INTERVAL_MINUTES = 60 * 24 * 31;

/** Next slot strictly after `now`, keeping the original cadence (no drift, no catch-up storm). */
export function nextSlotAfter(slot: Date, intervalMinutes: number, now: Date): Date {
  const step = intervalMinutes * 60_000;
  const missed = Math.max(0, Math.floor((now.getTime() - slot.getTime()) / step));
  return new Date(slot.getTime() + (missed + 1) * step);
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 80) : "SCHEDULE_FAILED";
}

/**
 * Turn due schedules into executions. Each slot uses a deterministic
 * idempotency key, so concurrent workers or a crash between "create" and
 * "advance" never produce a duplicate run for the same slot.
 */
export async function runDueSchedules(now = new Date()): Promise<number> {
  const db = getDb();
  for(const task of automationTasks) {
    const interval=task.schedule?.automaticIntervalMinutes;
    if(!interval)continue;
    if(!Number.isSafeInteger(interval)||interval<(task.schedule?.minIntervalMinutes ?? 60)||interval>MAX_INTERVAL_MINUTES)throw new Error("AUTOMATIC_SCHEDULE_INVALID");
    try{await assertTaskModulesUsable(task.key);}catch{continue;}
    await db.automationSchedule.upsert({where:{id:`maintenance:${task.key}`},create:{id:`maintenance:${task.key}`,taskKey:task.key,taskVersion:task.version,organizationId:"default",intervalMinutes:interval,nextRunAt:now,createdById:null},update:{taskVersion:task.version}});
  }
  const due = await db.automationSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: SCHEDULE_BATCH,
  });

  let created = 0;
  for (const schedule of due) {
    const slotAt = schedule.nextRunAt;
    const next = nextSlotAfter(slotAt, schedule.intervalMinutes, now);
    const task = findAutomationTask(schedule.taskKey);
    let executionId: string | null = null;
    let disable = false;

    try {
      if (!task || task.version !== schedule.taskVersion || !task.schedule) {
        disable = true;
        throw new Error("SCHEDULE_TASK_UNAVAILABLE");
      }
      await assertTaskModulesUsable(task.key);
      const execution = await createTaskExecutionRecord({
        task,
        organizationId: schedule.organizationId,
        requestedById: schedule.createdById,
        sourceModule: taskModuleKey(task.key),
        correlationId: `schedule:${schedule.id}`,
        input: task.schedule.input({ scheduleId: schedule.id, slotAt }) as Prisma.InputJsonValue,
        context: { locale: defaultAutomationLocale(), scheduleId: schedule.id },
        idempotencyKey: `schedule:${schedule.id}:${slotAt.toISOString()}`,
      });
      executionId = execution.id;
      created += 1;
    } catch (error) {
      // An unavailable module skips this slot; the schedule stays and resumes
      // once the module is usable again. A removed task disables the schedule.
      console.warn("[automation:scheduler] Slot atlandı:", errorCode(error));
    }

    await db.automationSchedule.updateMany({
      where: { id: schedule.id, nextRunAt: slotAt },
      data: {
        nextRunAt: next,
        lastRunAt: now,
        ...(executionId ? { lastExecutionId: executionId } : {}),
        ...(disable ? { enabled: false } : {}),
      },
    });
  }
  return created;
}

export const RETENTION = {
  succeededDays: 90,
  failedDays: 180,
  outboxDays: 14,
} as const;

/** Delete old terminal executions (cascade to steps/logs) and published outbox rows. */
export async function purgeAutomationHistory(now = new Date()): Promise<void> {
  const db = getDb();
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  await db.automationExecution.deleteMany({
    where: { status: { in: ["SUCCEEDED", "CANCELLED"] }, finishedAt: { lt: days(RETENTION.succeededDays) } },
  });
  await db.automationExecution.deleteMany({
    where: { status: "FAILED", finishedAt: { lt: days(RETENTION.failedDays) } },
  });
  await db.automationOutbox.deleteMany({
    where: { status: { in: ["PUBLISHED", "FAILED"] }, updatedAt: { lt: days(RETENTION.outboxDays) } },
  });
}
