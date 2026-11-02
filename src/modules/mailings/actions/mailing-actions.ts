"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { mailingsPermissions } from "../permissions";
import { deleteSegment, isMailConfigured, previewSource, saveSegment, sendTest, startCampaign } from "../services/campaigns";

const filterSchema = z.record(z.string().max(40), z.array(z.string().max(40)).max(20));
const baseSchema = z.object({ sourceId: z.string().min(3).max(80), filter: filterSchema });
const contentSchema = baseSchema.extend({
  subject: z.string().trim().min(3, "mailings.errors.subject").max(200, "mailings.errors.subject"),
  body: z.string().trim().min(10, "mailings.errors.body").max(20000, "mailings.errors.body"),
  /** Editörün ürettiği HTML (en fazla ~1 MB). */
  bodyHtml: z.string().max(1_000_000, "mailings.errors.body").optional(),
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

export async function saveSegmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: mailingsPermissions, action: "create" },
    schema: baseSchema.extend({ name: z.string().trim().min(2, "mailings.errors.segmentName").max(80, "mailings.errors.segmentName") }),
    handler: async ({ input, user, audit }) => {
      const saved = await saveSegment(user.role, { name: input.name, source: input.sourceId, filter: input.filter, actor: { id: user.id, label: buildUserLabel(user.name, user.email) } });
      if (!saved) throw new ActionError("mailings.errors.source");
      await audit({ action: "UPDATE", entity: "MailingSegment", entityId: saved.id, after: { name: input.name, source: input.sourceId, filter: input.filter } });
      revalidatePath("/toplu-eposta");
      return { id: saved.id };
    },
  });
  return run(input);
}

export async function deleteSegmentAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: mailingsPermissions, action: "create" },
    schema: z.object({ id: z.string().min(1) }),
    handler: async ({ input, audit }) => {
      await deleteSegment(input.id);
      await audit({ action: "DELETE", entity: "MailingSegment", entityId: input.id });
      revalidatePath("/toplu-eposta");
      return null;
    },
  });
  return run(input);
}
