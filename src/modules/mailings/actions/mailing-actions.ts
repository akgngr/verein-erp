"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { mailingsPermissions } from "../permissions";
import { isMailConfigured, previewSource, sendTest, startCampaign } from "../services/campaigns";

const filterSchema = z.record(z.string().max(40), z.array(z.string().max(40)).max(20));
const baseSchema = z.object({ sourceId: z.string().min(3).max(80), filter: filterSchema });
const contentSchema = baseSchema.extend({
  subject: z.string().trim().min(3, "mailings.errors.subject").max(200, "mailings.errors.subject"),
  body: z.string().trim().min(10, "mailings.errors.body").max(20000, "mailings.errors.body"),
});

export async function previewMailingAction(input: unknown): Promise<ActionResult<{ matched: number; eligible: number; noEmail: number; optOut: number }>> {
  const run = createAction({
    permission: { definition: mailingsPermissions, action: "create" },
    schema: baseSchema,
    handler: async ({ input, user }) => {
      const result = await previewSource(user.role, input.sourceId, input.filter);
      if (!result) throw new ActionError("mailings.errors.source");
      return result;
    },
  });
  return run(input);
}

export async function sendMailingTestAction(input: unknown): Promise<ActionResult<{ to: string }>> {
  const run = createAction({
    permission: { definition: mailingsPermissions, action: "create" },
    schema: contentSchema,
    handler: async ({ input, user }) => {
      if (!(await isMailConfigured())) throw new ActionError("mailings.errors.notConfigured");
      const result = await sendTest(user.role, { ...input, to: user.email, toName: user.name });
      if (!result) throw new ActionError("mailings.errors.source");
      if (!result.ok) throw new ActionError("mailings.errors.sendFailed");
      return { to: user.email };
    },
  });
  return run(input);
}

export async function startMailingAction(input: unknown): Promise<ActionResult<{ recipients: number }>> {
  const run = createAction({
    permission: { definition: mailingsPermissions, action: "create" },
    schema: contentSchema,
    handler: async ({ input, user, audit }) => {
      if (!(await isMailConfigured())) throw new ActionError("mailings.errors.notConfigured");
      const result = await startCampaign(user.role, { ...input, actor: { id: user.id, label: buildUserLabel(user.name, user.email) } });
      if (!result) throw new ActionError("mailings.errors.source");
      if (result.recipients === 0) throw new ActionError("mailings.errors.noRecipients");
      // KVKK: denetim kaydına alıcı listesi değil, kaynak, filtre ve sayı yazılır.
      await audit({ action: "CREATE", entity: "MailingCampaign", entityId: result.id, after: { source: input.sourceId, filter: input.filter, recipients: result.recipients } });
      revalidatePath("/toplu-eposta");
      return { recipients: result.recipients };
    },
  });
  return run(input);
}
