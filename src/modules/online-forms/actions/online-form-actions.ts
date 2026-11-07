"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { membersPermissions } from "@/modules/members";
import { studentsPermissions } from "@/modules/students";
import type { ActionResult } from "@/shared/types/action";
import { can } from "@/shared/permissions/define";
import { canEncryptSecrets } from "@/shared/security/secret-box";
import { buildUserLabel } from "@/shared/utils";

import { CHANNELS, KINDS } from "../lib/schemas";
import { onlineFormsPermissions } from "../permissions";
import { cancelRequest, createAndSend, getSignature, previewTarget } from "../services/requests";

const id = z.string().min(1).max(64);
const target = z.object({ kind: z.enum(KINDS), subjectId: id });

/** Kaynak kaydı güncelleme yetkisi de gerekir (form kaydı değiştirir). */
function canWriteSubject(role: Parameters<typeof can>[0], kind: (typeof KINDS)[number]) {
  return kind === "MEMBER" ? can(role, membersPermissions, "update") : can(role, studentsPermissions, "update");
}

export async function previewOnlineFormAction(input: unknown) {
  return createAction({
    permission: { definition: onlineFormsPermissions, action: "create" },
    schema: target,
    handler: async ({ input, user }) => {
      if (!canWriteSubject(user.role, input.kind)) throw new ActionError("online-forms.errors.forbidden");
      const preview = await previewTarget(input.kind, input.subjectId);
      if (!preview) throw new ActionError("online-forms.errors.notFound");
      return preview;
    },
  })(input);
}

export async function sendOnlineFormAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: onlineFormsPermissions, action: "create" },
    schema: target.extend({ channel: z.enum(CHANNELS), guardianId: id.nullable().optional() }),
    handler: async ({ input, user, audit }) => {
      if (!canWriteSubject(user.role, input.kind)) throw new ActionError("online-forms.errors.forbidden");
      if (!canEncryptSecrets()) throw new ActionError("online-forms.errors.noEncryption");
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      if (!host) throw new ActionError("online-forms.errors.sendFailed");
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      const t = await getTranslations("online-forms.message");
      const result = await createAndSend(input, { id: user.id, label: buildUserLabel(user.name, user.email) }, `${proto}://${host}`, (org, name) => ({
        subject: t("subject", { org }),
        text: (link, until) => t("text", { org, name, link, until }),
      }));
      if (!result.ok) throw new ActionError(`online-forms.errors.${result.error}`);
      await audit({ action: "CREATE", entity: "OnlineFormRequest", entityId: result.id });
      revalidatePath("/online-formlar");
      return { id: result.id };
    },
  })(input);
}

export async function cancelOnlineFormAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: onlineFormsPermissions, action: "update" },
    schema: z.object({ id }),
    handler: async ({ input }) => {
      await cancelRequest(input.id);
      revalidatePath("/online-formlar");
      return null;
    },
  })(input);
}

export async function getOnlineFormSignatureAction(input: unknown) {
  return createAction({
    permission: { definition: onlineFormsPermissions, action: "view" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      const signature = await getSignature(input.id);
      if (!signature) throw new ActionError("online-forms.errors.notFound");
      await audit({ action: "VIEW", entity: "OnlineFormRequest", entityId: input.id });
      return { signature };
    },
  })(input);
}
