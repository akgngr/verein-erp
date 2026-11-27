import "server-only";

import { createHash } from "node:crypto";

import { channelFetch } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";
import { openSecret } from "@/shared/security/secret-box";

import { getChannelConfig, saveChannelConfig } from "./channel-config";

/**
 * N5 (#362) — WhatsApp via Meta Cloud API. **Fail closed** until the owner finishes Meta Business verification:
 * the channel sends only if it is enabled AND access token, phone number ID and template are stored AND an admin
 * has confirmed that Meta approved the template (`templateApproved`). Business-initiated messages must use an
 * approved template; the body carries only the generic count and the app link (no names, titles or amounts).
 * The access token is stored encrypted in the DB (ADR 0006); only graph.facebook.com is reachable.
 */
const ADDRESS_PURPOSE = "notification-channel-address";
export const WHATSAPP_HOST = "graph.facebook.com";
export const DEFAULT_GRAPH_VERSION = "v21.0";

export class WhatsappError extends Error {}

export type WhatsappSettings = { phoneNumberId?: string; templateName?: string; templateLanguage?: string; templateApproved?: string; graphVersion?: string; verifyTemplateName?: string };

export type WhatsappMessage = { to: string; count: number; link: string };
export type WhatsappTransport = (input: { accessToken: string; phoneNumberId: string; graphVersion: string; body: unknown }) => Promise<{ ok: boolean; providerId?: string }>;

const PHONE_NUMBER_ID = /^\d{6,20}$/;
const TEMPLATE_NAME = /^[a-z0-9_]{1,512}$/;
const TEMPLATE_LANGUAGE = /^[a-z]{2}(_[A-Z]{2})?$/;
const GRAPH_VERSION = /^v\d{1,2}\.\d$/;
const E164 = /^\+?[1-9]\d{6,14}$/;

/** Pure: the exact Cloud API payload (template message, two text params: count and link). */
export function buildTemplatePayload(settings: Required<Pick<WhatsappSettings, "templateName" | "templateLanguage">>, message: WhatsappMessage) {
  const count = Number.isSafeInteger(message.count) && message.count > 0 ? message.count : 1;
  return {
    messaging_product: "whatsapp",
    to: message.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: settings.templateName,
      language: { code: settings.templateLanguage },
      components: [{ type: "body", parameters: [{ type: "text", text: String(count) }, { type: "text", text: message.link }] }],
    },
  };
}

/** Pure: is the channel allowed to send? (fail closed) */
export function whatsappReady(config: { enabled: boolean; secrets: Record<string, string>; settings: WhatsappSettings }): boolean {
  const s = config.settings;
  return config.enabled && Boolean(config.secrets.accessToken) && PHONE_NUMBER_ID.test(s.phoneNumberId ?? "") && TEMPLATE_NAME.test(s.templateName ?? "")
    && TEMPLATE_LANGUAGE.test(s.templateLanguage ?? "") && s.templateApproved === "true";
}

export const whatsappTransport: WhatsappTransport = async ({ accessToken, phoneNumberId, graphVersion, body }) => {
  const response = await channelFetch([WHATSAPP_HOST], `https://${WHATSAPP_HOST}/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return { ok: false };
  const json = (await response.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  return { ok: true, providerId: json.messages?.[0]?.id };
};

/** Admin: store credentials/template. Enabling requires everything plus the explicit "Meta approved the template" confirmation. */
export async function configureWhatsapp(
  input: { enabled: boolean; accessToken?: string; phoneNumberId?: string; templateName?: string; templateLanguage?: string; templateApproved?: boolean; graphVersion?: string; verifyTemplateName?: string },
  actorId: string,
): Promise<void> {
  const current = await getChannelConfig("whatsapp");
  const settings: WhatsappSettings = {
    ...(current.settings as WhatsappSettings),
    ...(input.phoneNumberId !== undefined ? { phoneNumberId: input.phoneNumberId.trim() } : {}),
    ...(input.templateName !== undefined ? { templateName: input.templateName.trim() } : {}),
    ...(input.templateLanguage !== undefined ? { templateLanguage: input.templateLanguage.trim() } : {}),
    ...(input.templateApproved !== undefined ? { templateApproved: String(input.templateApproved) } : {}),
    ...(input.graphVersion !== undefined ? { graphVersion: input.graphVersion.trim() } : {}),
    ...(input.verifyTemplateName !== undefined ? { verifyTemplateName: input.verifyTemplateName.trim() } : {}),
  };
  if (settings.phoneNumberId && !PHONE_NUMBER_ID.test(settings.phoneNumberId)) throw new WhatsappError("notifications.channels.errors.whatsappConfig");
  if (settings.templateName && !TEMPLATE_NAME.test(settings.templateName)) throw new WhatsappError("notifications.channels.errors.whatsappConfig");
  if (settings.templateLanguage && !TEMPLATE_LANGUAGE.test(settings.templateLanguage)) throw new WhatsappError("notifications.channels.errors.whatsappConfig");
  if (settings.graphVersion && !GRAPH_VERSION.test(settings.graphVersion)) throw new WhatsappError("notifications.channels.errors.whatsappConfig");
  if (settings.verifyTemplateName && !TEMPLATE_NAME.test(settings.verifyTemplateName)) throw new WhatsappError("notifications.channels.errors.whatsappConfig");
  const accessToken = input.accessToken?.trim() || current.secrets.accessToken;
  if (input.enabled && !whatsappReady({ enabled: true, secrets: accessToken ? { accessToken } : {}, settings })) throw new WhatsappError("notifications.channels.errors.whatsappNotReady");
  await saveChannelConfig("whatsapp", { enabled: input.enabled, secrets: { accessToken: input.accessToken ?? "" }, settings: settings as Record<string, string> }, actorId);
}

export async function whatsappAvailable(): Promise<boolean> {
  const config = await getChannelConfig("whatsapp");
  return whatsappReady({ ...config, settings: config.settings as WhatsappSettings });
}

/** Verified WhatsApp number of the user (opt-in link); null if none. */
export async function whatsappNumberFor(userId: string): Promise<string | null> {
  const row = await getDb().notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "whatsapp" } } });
  if (!row?.verifiedAt || row.revokedAt || !row.addressEnc) return null;
  const number = openSecret(ADDRESS_PURPOSE, row.addressEnc);
  return number && E164.test(number) ? number : null;
}

/** Dispatcher: send the generic template to a verified number. null = not sendable to this user. */
export async function sendWhatsapp(userId: string, count: number, link: string, transport: WhatsappTransport = whatsappTransport): Promise<{ ok: boolean; providerId?: string } | null> {
  const config = await getChannelConfig("whatsapp");
  const settings = config.settings as WhatsappSettings;
  if (!whatsappReady({ ...config, settings })) return null;
  const to = await whatsappNumberFor(userId);
  if (!to) return null;
  const body = buildTemplatePayload({ templateName: settings.templateName!, templateLanguage: settings.templateLanguage! }, { to, count, link });
  return transport({ accessToken: config.secrets.accessToken, phoneNumberId: settings.phoneNumberId!, graphVersion: settings.graphVersion || DEFAULT_GRAPH_VERSION, body }).catch(() => ({ ok: false }));
}

/** Hash used for audit/logging of a number without revealing it. */
export const numberHash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 12);
