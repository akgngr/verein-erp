"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { automationPermissions } from "../permissions";
import { cancelExecution, retryExecution } from "../services/execution-control";
import { deleteSchedule, scheduleTask, setScheduleEnabled } from "../services/schedules";

const idSchema = z.object({ id: z.string().min(1).max(128) });

function mapError(error: unknown): never {
  const code = error instanceof Error ? error.message : "";
  const known: Record<string, string> = {
    AUTOMATION_NOT_CANCELLABLE: "automation.errors.notCancellable",
    AUTOMATION_NOT_RETRYABLE: "automation.errors.notRetryable",
    AUTOMATION_MODULE_UNAVAILABLE: "automation.errors.moduleUnavailable",
    AUTOMATION_TASK_NOT_SCHEDULABLE: "automation.errors.notSchedulable",
    AUTOMATION_SCHEDULE_INTERVAL_INVALID: "automation.errors.interval",
    AUTOMATION_SCHEDULE_NOT_FOUND: "automation.errors.scheduleNotFound",
    AUTOMATION_DISABLED: "automation.errors.disabled",
  };
  if (known[code]) throw new ActionError(known[code]);
  throw error;
}

export async function cancelExecutionAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "update" },
    schema: idSchema,
    handler: async ({ input, user }) => {
      await cancelExecution(input.id, "Cancelled by user", user.id).catch(mapError);
      revalidatePath("/automation");
      return { ok: true as const };
    },
  })(input);
}

export async function retryExecutionAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "update" },
    schema: idSchema,
    handler: async ({ input, user }) => {
      await retryExecution(input.id, user.id).catch(mapError);
      revalidatePath("/automation");
      return { ok: true as const };
    },
  })(input);
}

export async function createScheduleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: z.object({
      taskKey: z.string().min(3).max(120),
      intervalMinutes: z.coerce.number().int().min(1).max(60 * 24 * 31),
    }),
    handler: async ({ input, user }) => {
      const created = await scheduleTask({ ...input, createdById: user.id }).catch(mapError);
      revalidatePath("/automation");
      return created;
    },
  })(input);
}

export async function toggleScheduleAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: idSchema.extend({ enabled: z.boolean() }),
    handler: async ({ input }) => {
      await setScheduleEnabled(input.id, input.enabled).catch(mapError);
      revalidatePath("/automation");
      return { ok: true as const };
    },
  })(input);
}

export async function deleteScheduleAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: automationPermissions, action: "approve" },
    schema: idSchema,
    handler: async ({ input }) => {
      await deleteSchedule(input.id);
      revalidatePath("/automation");
      return { ok: true as const };
    },
  })(input);
}
