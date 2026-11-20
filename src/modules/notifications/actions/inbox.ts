"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { notificationsPermissions } from "../permissions";
import { dismiss, listNotifications, markAllRead, markRead, NotificationError, type NotificationView, snooze, unreadCount } from "../services/inbox";

const permission = { definition: notificationsPermissions, action: "view" as const };
const id = z.string().min(1).max(64);

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotificationError) throw new ActionError(error.message);
    throw error;
  }
}

const translate = async (moduleKey: string) => (await import("next-intl/server")).getTranslations(moduleKey) as unknown as (key: string, values?: Record<string, string | number>) => string;

/** N1a (#354): çekmece listesi (yalnız kendi, yetkiyle süzülmüş). */
export async function listNotificationsAction(input: unknown): Promise<ActionResult<NotificationView[]>> {
  return createAction({
    permission,
    schema: z.object({ unreadOnly: z.boolean().default(false), module: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/).optional(), before: z.string().datetime().optional(), limit: z.number().int().min(1).max(100).default(30) }).strict(),
    handler: async ({ input, user }) => listNotifications(user, { unreadOnly: input.unreadOnly, module: input.module, limit: input.limit, before: input.before ? new Date(input.before) : undefined }, translate),
  })(input ?? {});
}

/** Zil rozeti (yoklama). */
export async function unreadNotificationCountAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  return createAction({ permission, schema: z.object({}).strict(), handler: async ({ user }) => ({ count: await unreadCount(user.id) }) })(input ?? {});
}

export async function markNotificationsReadAction(input: unknown): Promise<ActionResult<{ updated: number }>> {
  return createAction({ permission, schema: z.object({ ids: z.array(id).min(1).max(100) }).strict(), handler: async ({ input, user }) => ({ updated: await markRead(user.id, input.ids) }) })(input);
}

export async function markAllNotificationsReadAction(input: unknown): Promise<ActionResult<{ updated: number }>> {
  return createAction({ permission, schema: z.object({}).strict(), handler: async ({ user }) => ({ updated: await markAllRead(user.id) }) })(input ?? {});
}

export async function snoozeNotificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission,
    schema: z.object({ id, until: z.string().datetime() }).strict(),
    handler: async ({ input, user }) => { await guard(() => snooze(user.id, input.id, new Date(input.until))); return null; },
  })(input);
}

export async function dismissNotificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({ permission, schema: z.object({ id }).strict(), handler: async ({ input, user }) => { await guard(() => dismiss(user.id, input.id)); return null; } })(input);
}
