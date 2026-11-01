"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { mailInboxPermissions } from "../permissions";
import { hasEncryptionKey } from "../services/mail-crypto";
import { deleteInboxMessage, fetchImap, importAttachmentToAccounting, isAccountingUsable, saveInboxSettings, setMessageStatus } from "../services/inbox";

const refresh = () => revalidatePath("/mail/gelen-kutusu");

const settingsSchema = z.object({
  host: z.string().trim().max(200),
  port: z.coerce.number().int().min(1).max(65535),
  security: z.enum(["SSL", "STARTTLS", "NONE"]),
  username: z.string().trim().max(200),
  password: z.string().max(500).default(""),
  mailbox: z.string().trim().max(200).default("INBOX"),
});
const idSchema = z.object({ id: z.string().min(1) });
const statusSchema = z.object({ id: z.string().min(1), status: z.enum(["NEW", "DONE"]) });

export async function saveInboxSettingsAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: mailInboxPermissions, action: "update" },
    schema: settingsSchema,
    handler: async ({ input, audit }) => {
      if (input.password && !hasEncryptionKey()) throw new ActionError("mail.inbox.errors.encryptionKeyMissing");
      await saveInboxSettings(input);
      // Şifre denetim kaydına yazılmaz.
      await audit({ action: "SETTINGS_UPDATE", entity: "MailInboxSettings", entityId: "default", after: { host: input.host, port: input.port, security: input.security, mailbox: input.mailbox, passwordChanged: Boolean(input.password) } });
      refresh();
      return null;
    },
  });
  return run(input);
}

export async function fetchInboxAction(input: unknown): Promise<ActionResult<{ fetched: number; created: number }>> {
  const run = createAction({
    permission: { definition: mailInboxPermissions, action: "create" },
    schema: z.object({}).strict(),
    handler: async ({ audit }) => {
      try {
        const result = await fetchImap();
        await audit({ action: "IMPORT", entity: "MailInboxMessage", after: result });
        refresh();
        return result;
      } catch (error) {
        refresh();
        const code = error instanceof Error && error.message.startsWith("inbox:") ? error.message.slice(6) : "connectionFailed";
        throw new ActionError(`mail.inbox.errors.${code === "notConfigured" || code === "passwordUnreadable" ? code : "connectionFailed"}`);
      }
    },
  });
  return run(input ?? {});
}

export async function importAttachmentAction(input: unknown): Promise<ActionResult<{ duplicate: boolean; payableId: string }>> {
  const run = createAction({
    permission: { definition: mailInboxPermissions, action: "create" },
    schema: idSchema,
    handler: async ({ input, user, audit }) => {
      if (!(await isAccountingUsable())) throw new ActionError("mail.inbox.errors.accountingOff");
      const result = await importAttachmentToAccounting(input.id, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: "IMPORT", entity: "MailInboxAttachment", entityId: input.id, after: { payableId: result.payableId, duplicate: !result.ok } });
      refresh();
      revalidatePath("/muhasebe/gelen-faturalar");
      return { duplicate: !result.ok, payableId: result.payableId };
    },
  });
  return run(input);
}

export async function setInboxStatusAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: mailInboxPermissions, action: "create" },
    schema: statusSchema,
    handler: async ({ input }) => {
      await setMessageStatus(input.id, input.status);
      refresh();
      return null;
    },
  });
  return run(input);
}

export async function deleteInboxMessageAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: mailInboxPermissions, action: "delete" },
    schema: idSchema,
    handler: async ({ input, audit }) => {
      await deleteInboxMessage(input.id);
      await audit({ action: "DELETE", entity: "MailInboxMessage", entityId: input.id });
      refresh();
      return null;
    },
  });
  return run(input);
}
