"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { mailInboxPermissions } from "../permissions";
import { discardReplyDraft, listMyReplyDrafts, readReplyDraft, ReplyDraftError, REPLY_BODY_MAX, saveReplyDraftBody, sendReplyDraft } from "../services/inbox-drafts";
import { hasTriageOptIn, isTriageEnabled, setTriageEnabled, setTriageOptIn } from "../services/inbox-triage";
import { hasEncryptionKey } from "../services/mail-crypto";
import { isMailConfigured, sendMail } from "../services/mail-service";

const refresh = () => revalidatePath("/mail/gelen-kutusu");
const draftId = z.object({ draftId: z.string().min(1).max(64) }).strict();
const draftBody = z.object({ draftId: z.string().min(1).max(64), body: z.string().max(REPLY_BODY_MAX) }).strict();

function mapError(error: unknown): never {
  if (error instanceof ReplyDraftError) throw new ActionError(error.message);
  throw error;
}

/** Yönetici: kurum düzeyinde yerel sınıflamayı aç/kapat (S4.1 #313). */
export async function setInboxTriageAction(input: unknown): Promise<ActionResult<{ enabled: boolean }>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "update" },
    schema: z.object({ enabled: z.boolean() }).strict(),
    handler: async ({ input, audit }) => {
      await setTriageEnabled(input.enabled);
      await audit({ action: "SETTINGS_UPDATE", entity: "MailInboxSettings", entityId: "default", after: { triageEnabled: input.enabled } });
      refresh();
      return { enabled: input.enabled };
    },
  })(input);
}

/** Kullanıcı: sekreterin gelen posta önerileri için rıza (opt-in/opt-out). Opt-out açık taslakları siler. */
export async function setMyInboxTriageOptInAction(input: unknown): Promise<ActionResult<{ optedIn: boolean }>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: z.object({ optedIn: z.boolean() }).strict(),
    handler: async ({ input, user, audit }) => {
      await setTriageOptIn(user.id, input.optedIn);
      await audit({ action: "UPDATE", entity: "MailTriageOptIn", entityId: user.id, after: { optedIn: input.optedIn } });
      return { optedIn: input.optedIn };
    },
  })(input);
}

export async function getMyInboxTriageStateAction(input: unknown): Promise<ActionResult<{ enabled: boolean; optedIn: boolean; drafts: Awaited<ReturnType<typeof listMyReplyDrafts>> }>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async ({ user }) => ({ enabled: await isTriageEnabled(), optedIn: await hasTriageOptIn(user.id), drafts: await listMyReplyDrafts(user.id) }),
  })(input ?? {});
}

export async function readReplyDraftAction(input: unknown) {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: draftId,
    handler: async ({ input, user }) => readReplyDraft(input.draftId, user.id).catch(mapError),
  })(input);
}

export async function saveReplyDraftAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: draftBody,
    handler: async ({ input, user }) => {
      if (!hasEncryptionKey()) throw new ActionError("mail.inbox.errors.encryptionKeyMissing");
      await saveReplyDraftBody(input.draftId, user.id, input.body).catch(mapError);
      return null;
    },
  })(input);
}

/** 2. onay: kullanıcının yazdığı gövdeyle gönder (dış eylem). Gönderim yetkisi = gelen kutusu "create". */
export async function sendReplyDraftAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "create" },
    schema: draftBody,
    handler: async ({ input, user, audit }) => {
      const result = await sendReplyDraft(input.draftId, user.id, input.body, { isMailConfigured, send: sendMail }).catch(mapError);
      // Denetimde gövde/adres yok; yalnız günlük kimliği.
      await audit({ action: "SEND", entity: "MailReplyDraft", entityId: input.draftId, after: { mailLog: result.logId ?? null } });
      refresh();
      return null;
    },
  })(input);
}

export async function discardReplyDraftAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: draftId,
    handler: async ({ input, user, audit }) => {
      await discardReplyDraft(input.draftId, user.id).catch(mapError);
      await audit({ action: "DELETE", entity: "MailReplyDraft", entityId: input.draftId });
      refresh();
      return null;
    },
  })(input);
}
