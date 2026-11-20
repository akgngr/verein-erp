"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { followUpInputSchema, type FollowUpCommand, type FollowUpStatus } from "../services/follow-up-policy";
import { createFollowUp, FollowUpError, type FollowUpView, listFollowUps, transitionFollowUp } from "../services/follow-ups";

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof FollowUpError) throw new ActionError(error.message);
    throw error;
  }
}

/** S4.2 (#314): "benim yerime takip et" kaydı. Denetimde başlık yok (yalnız modül ve tarih). */
export async function createFollowUpAction(input: unknown): Promise<ActionResult<FollowUpView>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: followUpInputSchema,
    handler: async ({ input, user, audit }) => {
      const created = await guard(() => createFollowUp(user.id, input));
      await audit({ action: "CREATE", entity: "SecretaryFollowUp", entityId: created.id, after: { sourceModule: input.sourceModule, dueOn: input.dueOn, maxReminders: input.maxReminders } });
      revalidatePath("/sekreter");
      return created;
    },
  })(input);
}

export async function listMyFollowUpsAction(input: unknown): Promise<ActionResult<FollowUpView[]>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ includeClosed: z.boolean().default(false) }).strict(),
    handler: async ({ input, user }) => {
      const statuses: FollowUpStatus[] = input.includeClosed ? ["ACTIVE", "PAUSED", "EXHAUSTED", "DONE", "CANCELLED"] : ["ACTIVE", "PAUSED", "EXHAUSTED"];
      return listFollowUps(user.id, statuses);
    },
  })(input ?? {});
}

const commandSchema = z.object({ id: z.string().min(1).max(64), command: z.enum(["pause", "resume", "cancel", "complete"]) }).strict();

/** Duraklat / devam / iptal / tamamla. Yalnız sahibi; geçersiz geçiş reddedilir. */
export async function changeFollowUpAction(input: unknown): Promise<ActionResult<{ status: FollowUpStatus }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: commandSchema,
    handler: async ({ input, user, audit }) => {
      const status = await guard(() => transitionFollowUp(user, input.id, input.command as FollowUpCommand));
      await audit({ action: "UPDATE", entity: "SecretaryFollowUp", entityId: input.id, after: { command: input.command, status } });
      revalidatePath("/sekreter");
      return { status };
    },
  })(input);
}
