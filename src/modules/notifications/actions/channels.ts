"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { notificationsPermissions } from "../permissions";
import { type ChannelConfigView, listChannelConfigs } from "../services/channel-config";
import { configureTelegram, requestTelegramLink, revokeTelegramLink, TelegramError, telegramLinkStatus } from "../services/telegram";

const view = { definition: notificationsPermissions, action: "view" as const };
const admin = { definition: notificationsPermissions, action: "update" as const };

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TelegramError) throw new ActionError(error.message.startsWith("notifications.") ? error.message : "notifications.channels.errors.telegramWebhook");
    throw error;
  }
}

/** Yönetici: kanal ayarları (sır değeri yok, yalnız kayıtlı sır anahtarları). */
export async function listNotificationChannelsAction(input: unknown): Promise<ActionResult<ChannelConfigView[]>> {
  return createAction({ permission: admin, schema: z.object({}).strict(), handler: async () => listChannelConfigs(["telegram", "whatsapp", "sms", "web_push"]) })(input ?? {});
}

/** Yönetici: Telegram bot token'ı (DB'de şifreli; boş bırakılırsa mevcut korunur) + webhook kaydı. Denetimde token yok. */
export async function saveTelegramChannelAction(input: unknown): Promise<ActionResult<{ botUsername: string | null }>> {
  return createAction({
    permission: admin,
    schema: z.object({ enabled: z.boolean(), botToken: z.string().max(100).optional() }).strict(),
    handler: async ({ input, user, audit }) => {
      const { getEnv } = await import("@/shared/env");
      const result = await guard(() => configureTelegram(input, getEnv().APP_URL, user.id));
      await audit({ action: "SETTINGS_UPDATE", entity: "NotificationChannelConfig", entityId: "telegram", after: { enabled: input.enabled, tokenChanged: Boolean(input.botToken?.trim()) } });
      return result;
    },
  })(input);
}

/** Kullanıcı: Telegram bağlama bağlantısı (tek kullanımlık, 15 dakika). */
export async function requestTelegramLinkAction(input: unknown): Promise<ActionResult<{ url: string; expiresAt: string }>> {
  return createAction({
    permission: view,
    schema: z.object({}).strict(),
    handler: async ({ user, audit }) => {
      const link = await guard(() => requestTelegramLink(user.id));
      await audit({ action: "CREATE", entity: "NotificationChannelLink", entityId: `${user.id}:telegram`, after: { status: "pending" } });
      return link;
    },
  })(input ?? {});
}

export async function telegramLinkStatusAction(input: unknown): Promise<ActionResult<{ status: "linked" | "pending" | "none" }>> {
  return createAction({ permission: view, schema: z.object({}).strict(), handler: async ({ user }) => ({ status: await telegramLinkStatus(user.id) }) })(input ?? {});
}

/** Bağı kaldırma her zaman serbest. */
export async function revokeTelegramLinkAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    schema: z.object({}).strict(),
    handler: async ({ user, audit }) => {
      await revokeTelegramLink(user.id);
      await audit({ action: "UPDATE", entity: "NotificationChannelLink", entityId: `${user.id}:telegram`, after: { status: "revoked" } });
      return null;
    },
  })(input ?? {});
}
