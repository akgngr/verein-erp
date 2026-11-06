"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { calendarPermissions } from "../permissions";
import { publicOrigin } from "../services/origin";
import {
  connectWithPassword,
  disconnectAccount,
  listUserAccounts,
  saveApp,
  setSyncCalendarEnabled,
  startOAuth,
  syncAccount,
} from "../services/sync";

const provider = z.string().regex(/^[a-z0-9-]{1,40}$/);

/** Map service error codes to user-facing messages; anything else is generic. */
function fail(error: unknown): never {
  const code = error instanceof Error ? error.message : "";
  const known: Record<string, string> = {
    SYNC_APP_MISSING: "calendar.sync.errors.appMissing",
    SYNC_NO_ENCRYPTION: "calendar.sync.errors.encryption",
    SYNC_PROVIDER_UNAVAILABLE: "calendar.sync.errors.unavailable",
    SYNC_SECRET_REQUIRED: "calendar.sync.errors.secretRequired",
    SYNC_AUTH: "calendar.sync.errors.auth",
  };
  if (error instanceof ActionError) throw error;
  if (error && typeof error === "object" && (error as { name?: string }).name === "SyncAuthError") throw new ActionError(known.SYNC_AUTH);
  throw new ActionError(known[code] ?? "calendar.sync.errors.failed");
}

export async function startOAuthAction(input: unknown): Promise<ActionResult<{ url: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ provider }),
    handler: async ({ input, user }) => {
      try {
        return { url: await startOAuth(user.id, input.provider, await publicOrigin()) };
      } catch (error) {
        fail(error);
      }
    },
  })(input);
}

export async function connectPasswordAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({
      provider,
      username: z.string().trim().min(3).max(200),
      password: z.string().min(4).max(200),
      serverUrl: z.string().url().startsWith("https://").max(300).optional().or(z.literal("")),
    }),
    handler: async ({ input, user }) => {
      try {
        const id = await connectWithPassword(user.id, input.provider, { username: input.username, password: input.password, serverUrl: input.serverUrl || undefined });
        await syncAccount(id);
        revalidatePath("/calendar");
        return { id };
      } catch (error) {
        fail(error);
      }
    },
  })(input);
}

export async function syncNowAction(input: unknown): Promise<ActionResult<{ events: number }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ accountId: z.string().min(1).max(64) }),
    handler: async ({ input, user }) => {
      const own = (await listUserAccounts(user.id)).some((account) => account.id === input.accountId);
      if (!own) throw new ActionError("calendar.errors.forbidden");
      const result = await syncAccount(input.accountId);
      revalidatePath("/calendar");
      return result;
    },
  })(input);
}

export async function disconnectSyncAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ accountId: z.string().min(1).max(64) }),
    handler: async ({ input, user }) => {
      await disconnectAccount(user.id, input.accountId);
      revalidatePath("/calendar");
      return { ok: true as const };
    },
  })(input);
}

export async function toggleSyncCalendarAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ calendarId: z.string().min(1).max(64), enabled: z.boolean() }),
    handler: async ({ input, user }) => {
      try {
        await setSyncCalendarEnabled(user.id, input.calendarId, input.enabled);
      } catch {
        throw new ActionError("calendar.errors.forbidden");
      }
      revalidatePath("/calendar");
      return { ok: true as const };
    },
  })(input);
}

/** Admin: register the OAuth app of a provider. The secret is write-only. */
export async function saveSyncAppAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "approve" },
    schema: z.object({
      provider,
      clientId: z.string().trim().min(5).max(300),
      clientSecret: z.string().trim().max(500).optional().or(z.literal("")),
      tenant: z.string().trim().max(100).optional().or(z.literal("")),
    }),
    handler: async ({ input, user }) => {
      try {
        await saveApp(input.provider, { clientId: input.clientId, clientSecret: input.clientSecret || undefined, tenant: input.tenant || null }, user.id);
      } catch (error) {
        fail(error);
      }
      revalidatePath("/calendar");
      return { ok: true as const };
    },
  })(input);
}
