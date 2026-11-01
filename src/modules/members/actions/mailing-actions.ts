"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { memberMailingsPermissions } from "../permissions";
import { isMailConfigured, previewRecipients, sendMailingTest, startMailing } from "../services/bulk-mail";

const filterSchema = z.object({
  statuses: z.array(z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"])).max(4),
  types: z.array(z.enum(["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"])).max(4),
});
const contentSchema = filterSchema.extend({
  subject: z.string().trim().min(3, "members.mailing.errors.subject").max(200, "members.mailing.errors.subject"),
  body: z.string().trim().min(10, "members.mailing.errors.body").max(20000, "members.mailing.errors.body"),
});

export async function previewMailingAction(input: unknown): Promise<ActionResult<{ matched: number; eligible: number; noEmail: number; optOut: number }>> {
  const run = createAction({
    permission: { definition: memberMailingsPermissions, action: "create" },
    schema: filterSchema,
    handler: async ({ input }) => previewRecipients(input),
  });
  return run(input);
}

export async function sendMailingTestAction(input: unknown): Promise<ActionResult<{ to: string }>> {
  const run = createAction({
    permission: { definition: memberMailingsPermissions, action: "create" },
    schema: contentSchema,
    handler: async ({ input, user }) => {
      if (!(await isMailConfigured())) throw new ActionError("members.mailing.errors.notConfigured");
      const result = await sendMailingTest({ subject: input.subject, body: input.body, filter: input, to: user.email, toName: user.name });
      if (!result.ok) throw new ActionError("members.mailing.errors.sendFailed");
      return { to: user.email };
    },
  });
  return run(input);
}

export async function startMailingAction(input: unknown): Promise<ActionResult<{ recipients: number }>> {
  const run = createAction({
    permission: { definition: memberMailingsPermissions, action: "create" },
    schema: contentSchema,
    handler: async ({ input, user, audit }) => {
      if (!(await isMailConfigured())) throw new ActionError("members.mailing.errors.notConfigured");
      const result = await startMailing({
        subject: input.subject,
        body: input.body,
        filter: { statuses: input.statuses, types: input.types },
        actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
      });
      if (result.recipients === 0) throw new ActionError("members.mailing.errors.noRecipients");
      // KVKK: denetim kaydına alıcı listesi değil, yalnızca sayı ve filtre yazılır.
      await audit({ action: "CREATE", entity: "MemberMailing", entityId: result.id, after: { recipients: result.recipients, statuses: input.statuses, types: input.types } });
      revalidatePath("/uyeler/toplu-eposta");
      return { recipients: result.recipients };
    },
  });
  return run(input);
}
