"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { notificationsPermissions } from "../permissions";
import { type ChannelConfigView, listChannelConfigs } from "../services/channel-config";
import { configureSms, confirmSmsVerification, requestSmsVerification, revokeSms, SmsError } from "../services/sms";
import { configureWebPush, publicKey, subscribe, subscriptionSchema, unsubscribe, WebPushError } from "../services/web-push";
import { configureTelegram, requestTelegramLink, revokeTelegramLink, TelegramError, telegramLinkStatus } from "../services/telegram";
import { configureWhatsapp, WhatsappError } from "../services/whatsapp";
import { confirmWhatsappVerification, phoneLinkStatus, requestWhatsappVerification, revokeWhatsapp } from "../services/whatsapp-link";

const view = { definition: notificationsPermissions, action: "view" as const };
const admin = { definition: notificationsPermissions, action: "update" as const };

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof WebPushError || error instanceof SmsError || error instanceof WhatsappError) throw new ActionError(error.message);
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

/** Yönetici: Web Push kanalı (VAPID anahtarı ilk açılışta üretilir, DB'de şifreli). */
export async function saveWebPushChannelAction(input: unknown): Promise<ActionResult<{ publicKey: string | null }>> {
  return createAction({
    permission: admin,
    schema: z.object({ enabled: z.boolean() }).strict(),
    handler: async ({ input, user, audit }) => {
      const { getEnv } = await import("@/shared/env");
      const result = await guard(() => configureWebPush(input.enabled, getEnv().APP_URL, user.id));
      await audit({ action: "SETTINGS_UPDATE", entity: "NotificationChannelConfig", entityId: "web_push", after: { enabled: input.enabled } });
      return result;
    },
  })(input);
}

/** Kullanıcı: tarayıcı aboneliği için genel anahtar (kanal kapalıysa null). */
export async function getWebPushKeyAction(input: unknown): Promise<ActionResult<{ publicKey: string | null }>> {
  return createAction({ permission: view, schema: z.object({}).strict(), handler: async () => ({ publicKey: await publicKey() }) })(input ?? {});
}

export async function subscribeWebPushAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: view,
    schema: subscriptionSchema,
    handler: async ({ input, user, audit }) => {
      await guard(() => subscribe(user.id, input));
      await audit({ action: "CREATE", entity: "NotificationPushSubscription", entityId: user.id, after: { host: new URL(input.endpoint).hostname } });
      return null;
    },
  })(input);
}

/** Abonelikten çıkma her zaman serbest. */
export async function unsubscribeWebPushAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    schema: z.object({ endpoint: z.string().max(1000) }).strict(),
    handler: async ({ input, user }) => { await unsubscribe(user.id, input.endpoint); return null; },
  })(input);
}

/** Yönetici: SMS sağlayıcısı (seven/twilio); anahtar DB'de şifreli, boş bırakılırsa korunur. Denetimde anahtar yok. */
export async function saveSmsChannelAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: admin,
    schema: z.object({ enabled: z.boolean(), provider: z.enum(["seven", "twilio"]).optional(), apiKey: z.string().max(200).optional(), accountSid: z.string().max(64).optional(), sender: z.string().max(16).optional() }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => configureSms(input, user.id));
      await audit({ action: "SETTINGS_UPDATE", entity: "NotificationChannelConfig", entityId: "sms", after: { enabled: input.enabled, provider: input.provider ?? null, keyChanged: Boolean(input.apiKey?.trim()) } });
      return null;
    },
  })(input);
}

/**
 * N5 (#362): WhatsApp Cloud API ayarı. Etkinleştirmek için token, telefon numarası kimliği, şablon ve
 * "Meta şablonu onayladı" teyidi zorunludur (fail closed). Denetimde sır yok.
 */
export async function saveWhatsappChannelAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: admin,
    schema: z.object({
      enabled: z.boolean(),
      accessToken: z.string().max(1024).optional(),
      phoneNumberId: z.string().max(20).optional(),
      templateName: z.string().max(512).optional(),
      templateLanguage: z.string().max(5).optional(),
      templateApproved: z.boolean().optional(),
      graphVersion: z.string().max(6).optional(),
      verifyTemplateName: z.string().max(512).optional(),
    }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => configureWhatsapp(input, user.id));
      await audit({ action: "SETTINGS_UPDATE", entity: "NotificationChannelConfig", entityId: "whatsapp", after: { enabled: input.enabled, templateApproved: input.templateApproved ?? null, tokenChanged: Boolean(input.accessToken?.trim()) } });
      return null;
    },
  })(input);
}

/** Kullanıcı: SMS numarası doğrulama kodu iste. Denetimde numara yok. */
export async function requestSmsVerificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: view,
    schema: z.object({ phone: z.string().trim().min(6).max(32) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => requestSmsVerification(user.id, input.phone));
      await audit({ action: "CREATE", entity: "NotificationChannelLink", entityId: `${user.id}:sms`, after: { status: "pending" } });
      return null;
    },
  })(input);
}

export async function confirmSmsVerificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: view,
    schema: z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => confirmSmsVerification(user.id, input.code));
      await audit({ action: "UPDATE", entity: "NotificationChannelLink", entityId: `${user.id}:sms`, after: { status: "linked" } });
      return null;
    },
  })(input);
}

export async function revokeSmsAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({ schema: z.object({}).strict(), handler: async ({ user }) => { await revokeSms(user.id); return null; } })(input ?? {});
}

export type ChannelAvailability = { email: boolean; web_push: boolean; telegram: boolean; sms: boolean; whatsapp: boolean; whatsappLinking: boolean };

/**
 * #604 — user: which external channels actually deliver right now. The preferences table and the link cards show only
 * these; a toggle for an unconfigured channel would never deliver anything.
 */
export async function availableNotificationChannelsAction(input: unknown): Promise<ActionResult<ChannelAvailability>> {
  return createAction({
    permission: view,
    schema: z.object({}).strict(),
    handler: async () => {
      const [{ isMailConfigured }, { publicKey }, { getChannelConfig }, { smsAvailable }, whatsapp, link] = await Promise.all([
        import("@/modules/mail/automation"),
        import("../services/web-push"),
        import("../services/channel-config"),
        import("../services/sms"),
        import("../services/whatsapp"),
        import("../services/whatsapp-link"),
      ]);
      const [telegram, waConfig] = await Promise.all([getChannelConfig("telegram"), getChannelConfig("whatsapp")]);
      const waState = { ...waConfig, settings: waConfig.settings as import("../services/whatsapp").WhatsappSettings };
      const safe = async (check: () => Promise<boolean>) => check().catch(() => false);
      return {
        email: await safe(isMailConfigured),
        web_push: await safe(async () => Boolean(await publicKey())),
        telegram: telegram.enabled && Boolean(telegram.secrets.botToken),
        sms: await safe(smsAvailable),
        whatsapp: whatsapp.whatsappReady(waState),
        whatsappLinking: link.whatsappLinkingReady(waState),
      };
    },
  })(input ?? {});
}

/** #604 — user: own SMS/WhatsApp link status (number masked). */
export async function phoneLinkStatusAction(input: unknown): Promise<ActionResult<{ status: "linked" | "pending" | "none"; masked: string | null }>> {
  return createAction({
    permission: view,
    schema: z.object({ channel: z.enum(["sms", "whatsapp"]) }).strict(),
    handler: async ({ input, user }) => phoneLinkStatus(user.id, input.channel),
  })(input);
}

/** #604 — user: send a WhatsApp verification code (authentication template). No number in the audit. */
export async function requestWhatsappVerificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: view,
    schema: z.object({ phone: z.string().trim().min(6).max(32) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => requestWhatsappVerification(user.id, input.phone));
      await audit({ action: "CREATE", entity: "NotificationChannelLink", entityId: `${user.id}:whatsapp`, after: { status: "pending" } });
      return null;
    },
  })(input);
}

export async function confirmWhatsappVerificationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: view,
    schema: z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => confirmWhatsappVerification(user.id, input.code));
      await audit({ action: "UPDATE", entity: "NotificationChannelLink", entityId: `${user.id}:whatsapp`, after: { status: "linked" } });
      return null;
    },
  })(input);
}

export async function revokeWhatsappAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({ schema: z.object({}).strict(), handler: async ({ user }) => { await revokeWhatsapp(user.id); return null; } })(input ?? {});
}
