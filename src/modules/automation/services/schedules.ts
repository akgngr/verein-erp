import "server-only";

import { getDb } from "@/shared/db";
import { taskModuleKey } from "@/shared/automation/define";

import { automationTasks, findAutomationTask } from "../tasks/registry";
import { assertTaskModulesUsable } from "./execution-control";
import { DEFAULT_MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES } from "./scheduler";

export type SchedulableTask = { key: string; module: string; minIntervalMinutes: number };

/** Only tasks that declare `schedule` in trusted code are offered. */
export function listSchedulableTasks(): SchedulableTask[] {
  return automationTasks
    .filter((task) => task.schedule)
    .map((task) => ({
      key: task.key,
      module: taskModuleKey(task.key),
      minIntervalMinutes: task.schedule?.minIntervalMinutes ?? DEFAULT_MIN_INTERVAL_MINUTES,
    }));
}

export async function scheduleTask(input: {
  taskKey: string;
  intervalMinutes: number;
  firstRunAt?: Date;
  createdById: string | null;
  organizationId?: string;
}) {
  const task = findAutomationTask(input.taskKey);
  if (!task?.schedule) throw new Error("AUTOMATION_TASK_NOT_SCHEDULABLE");
  const min = task.schedule.minIntervalMinutes ?? DEFAULT_MIN_INTERVAL_MINUTES;
  if (!Number.isSafeInteger(input.intervalMinutes) ||
      input.intervalMinutes < min || input.intervalMinutes > MAX_INTERVAL_MINUTES) {
    throw new Error("AUTOMATION_SCHEDULE_INTERVAL_INVALID");
  }
  await assertTaskModulesUsable(task.key);

  const now = new Date();
  const firstRunAt = input.firstRunAt && input.firstRunAt > now ? input.firstRunAt : now;
  return getDb().automationSchedule.create({
    data: {
      taskKey: task.key,
      taskVersion: task.version,
      organizationId: input.organizationId ?? "default",
      intervalMinutes: input.intervalMinutes,
      nextRunAt: firstRunAt,
      createdById: input.createdById,
    },
    select: { id: true },
  });
}

export async function listSchedules(organizationId = "default") {
  return getDb().automationSchedule.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function setScheduleEnabled(id: string, enabled: boolean) {
  const db = getDb();
  const schedule = await db.automationSchedule.findUnique({ where: { id } });
  if (!schedule) throw new Error("AUTOMATION_SCHEDULE_NOT_FOUND");
  const now = new Date();
  await db.automationSchedule.update({
    where: { id },
    // Re-enabling starts from now instead of replaying missed slots.
    data: { enabled, ...(enabled && schedule.nextRunAt < now ? { nextRunAt: now } : {}) },
  });
}

export async function deleteSchedule(id: string) {
  await getDb().automationSchedule.deleteMany({ where: { id } });
}
