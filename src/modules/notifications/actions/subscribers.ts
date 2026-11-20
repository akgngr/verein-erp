"use server";

import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { notificationsPermissions } from "../permissions";
import { listSubscribers, removeSubscriberChannel, type SubscriberRow, type SubscriberSummary } from "../services/subscribers";

const admin = { definition: notificationsPermissions, action: "update" as const };

/** N8a (#375): yönetici abone listesi (kanal durumu; adres yok). Görüntüleme denetime yazılır. */
export async function listNotificationSubscribersAction(input: unknown): Promise<ActionResult<{ rows: SubscriberRow[]; total: number; summary: SubscriberSummary }>> {
  return createAction({
    permission: admin,
    schema: z.object({
      q: z.string().trim().max(80).optional(),
      channel: z.enum(["telegram", "web_push", "email_off"]).optional(),
      page: z.number().int().min(1).max(10_000).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
    }).strict(),
    handler: async ({ input, audit }) => {
      const result = await listSubscribers(input);
      await audit({ action: "VIEW", entity: "NotificationSubscribers", after: { page: input.page, channel: input.channel ?? null, searched: Boolean(input.q) } });
      return result;
    },
  })(input ?? {});
}

/** Yönetici: kullanıcının Telegram bağını veya push aboneliklerini kaldırır (denetimli). */
export async function removeSubscriberChannelAction(input: unknown): Promise<ActionResult<{ removed: number }>> {
  return createAction({
    permission: admin,
    schema: z.object({ userId: z.string().min(1).max(64), channel: z.enum(["telegram", "web_push"]) }).strict(),
    handler: async ({ input, audit }) => {
      const removed = await removeSubscriberChannel(input.userId, input.channel);
      await audit({ action: "DELETE", entity: "NotificationSubscription", entityId: input.userId, after: { channel: input.channel, removed } });
      return { removed };
    },
  })(input);
}
