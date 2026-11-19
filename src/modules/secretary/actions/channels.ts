"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { SECRETARY_EXTERNAL_CHANNELS } from "@/shared/secretary/channels";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { ChannelError, type ConsentView, confirmConsent, listConsents, requestConsent, revokeConsent } from "../services/channels";

const channel = z.enum(SECRETARY_EXTERNAL_CHANNELS);

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ChannelError) throw new ActionError(error.message);
    throw error;
  }
}

/** S5.2 (#316): kanal rızaları (maskeli adres). */
export async function listMyChannelConsentsAction(input: unknown): Promise<ActionResult<ConsentView[]>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async ({ user }) => listConsents(user.id),
  })(input ?? {});
}

/** Rıza başlat: doğrulama kodu kanala gönderilir. Sağlayıcı yapılandırılmamışsa reddedilir. Denetimde adres yok. */
export async function requestChannelConsentAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ channel, address: z.string().trim().min(3).max(40) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => requestConsent(user, input.channel, input.address));
      await audit({ action: "CREATE", entity: "SecretaryChannelConsent", entityId: `${user.id}:${input.channel}`, after: { channel: input.channel, status: "pending" } });
      return null;
    },
  })(input);
}

export async function confirmChannelConsentAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ channel, code: z.string().trim().regex(/^\d{6}$/) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => confirmConsent(user.id, input.channel, input.code));
      await audit({ action: "UPDATE", entity: "SecretaryChannelConsent", entityId: `${user.id}:${input.channel}`, after: { channel: input.channel, status: "active" } });
      return null;
    },
  })(input);
}

/** Rıza geri alma her zaman serbest (yetki kalkmış olsa bile kendi rızasını geri alabilir). */
export async function revokeChannelConsentAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    schema: z.object({ channel }).strict(),
    handler: async ({ input, user, audit }) => {
      await revokeConsent(user.id, input.channel);
      await audit({ action: "UPDATE", entity: "SecretaryChannelConsent", entityId: `${user.id}:${input.channel}`, after: { channel: input.channel, status: "revoked" } });
      return null;
    },
  })(input);
}
