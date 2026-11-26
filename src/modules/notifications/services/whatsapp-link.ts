import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { normalizePhone } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { getChannelConfig } from "./channel-config";
import { DEFAULT_GRAPH_VERSION, whatsappReady, whatsappTransport, WhatsappError, type WhatsappSettings, type WhatsappTransport } from "./whatsapp";

/**
 * #604 — WhatsApp number verification (same rules as SMS: 6-digit code stored as a hash, 15 min, 5 attempts,
 * 3 codes per day). Meta only allows one-time codes through an approved **authentication** template
 * (`verifyTemplateName`, body parameter = code, copy-code button). Without it, linking is unavailable.
 */
const ADDRESS_PURPOSE = "notification-channel-address";
const CODE_TTL_MS = 15 * 60_000;
export const WHATSAPP_LINK_LIMITS = { codeAttempts: 5, codesPerDay: 3 } as const;
const TEMPLATE_NAME = /^[a-z0-9_]{1,512}$/;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const codeHash = (userId: string, code: string) => sha(`whatsapp:${userId}:${code}`);

/** Pure: authentication-template payload (code in the body and in the copy-code button). */
export function buildVerificationPayload(settings: { verifyTemplateName: string; templateLanguage: string }, to: string, code: string) {
  return {
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: settings.verifyTemplateName,
      language: { code: settings.templateLanguage },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ],
    },
  };
}

/** Is self-service linking possible? Channel ready (fail closed) and an authentication template is configured. */
export function whatsappLinkingReady(config: { enabled: boolean; secrets: Record<string, string>; settings: WhatsappSettings }): boolean {
  return whatsappReady(config) && TEMPLATE_NAME.test(config.settings.verifyTemplateName ?? "");
}

export async function requestWhatsappVerification(userId: string, rawPhone: string, transport: WhatsappTransport = whatsappTransport, now = new Date()): Promise<void> {
  const config = await getChannelConfig("whatsapp");
  const settings = config.settings as WhatsappSettings;
  if (!whatsappLinkingReady({ ...config, settings })) throw new WhatsappError("notifications.channels.errors.unavailable");
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new WhatsappError("notifications.channels.errors.phoneInvalid");
  const db = getDb();
  const sent = await db.notificationDelivery.count({ where: { userId, channel: "whatsapp", dedupeKey: { startsWith: "verify:" }, createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } } });
  if (sent >= WHATSAPP_LINK_LIMITS.codesPerDay) throw new WhatsappError("notifications.channels.errors.rateLimited");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const data = { addressEnc: sealSecret(ADDRESS_PURPOSE, phone), addressHash: sha(phone), linkTokenHash: codeHash(userId, code), linkExpiresAt: new Date(now.getTime() + CODE_TTL_MS) };
  await db.notificationChannelLink.upsert({
    where: { userId_channel: { userId, channel: "whatsapp" } },
    create: { userId, channel: "whatsapp", ...data },
    update: { ...data, verifiedAt: null, revokedAt: null },
  });
  await db.notificationDelivery.create({ data: { userId, channel: "whatsapp", dedupeKey: `verify:${now.getTime()}`, status: "PENDING", attempts: 1 } });
  const body = buildVerificationPayload({ verifyTemplateName: settings.verifyTemplateName!, templateLanguage: settings.templateLanguage! }, phone, code);
  const result = await transport({ accessToken: config.secrets.accessToken!, phoneNumberId: settings.phoneNumberId!, graphVersion: settings.graphVersion || DEFAULT_GRAPH_VERSION, body }).catch(() => ({ ok: false }));
  if (!result.ok) throw new WhatsappError("notifications.channels.errors.sendFailed");
}

export async function confirmWhatsappVerification(userId: string, code: string, now = new Date()): Promise<void> {
  const db = getDb();
  const row = await db.notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "whatsapp" } } });
  if (!row?.linkTokenHash || !row.linkExpiresAt || row.linkExpiresAt <= now) throw new WhatsappError("notifications.channels.errors.codeExpired");
  const attempts = await db.notificationDelivery.count({ where: { userId, channel: "whatsapp", dedupeKey: { startsWith: "code-fail:" }, createdAt: { gte: new Date(row.linkExpiresAt.getTime() - CODE_TTL_MS) } } });
  if (attempts >= WHATSAPP_LINK_LIMITS.codeAttempts) throw new WhatsappError("notifications.channels.errors.codeExpired");
  const expected = Buffer.from(row.linkTokenHash);
  const given = Buffer.from(/^\d{6}$/.test(code) ? codeHash(userId, code) : "x".repeat(expected.length));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db.notificationDelivery.create({ data: { userId, channel: "whatsapp", dedupeKey: `code-fail:${now.getTime()}:${Math.random()}`, status: "FAILED", attempts: 1 } });
    throw new WhatsappError("notifications.channels.errors.codeInvalid");
  }
  await db.notificationChannelLink.update({ where: { id: row.id }, data: { verifiedAt: now, linkTokenHash: null, linkExpiresAt: null } });
}

export async function revokeWhatsapp(userId: string, now = new Date()): Promise<void> {
  await getDb().notificationChannelLink.updateMany({ where: { userId, channel: "whatsapp" }, data: { revokedAt: now, addressEnc: null, addressHash: null, linkTokenHash: null, linkExpiresAt: null, verifiedAt: null } });
}

/** #604: link status for the user's own phone channel; the number is returned masked only (last 3 digits). */
export async function phoneLinkStatus(userId: string, channel: "sms" | "whatsapp", now = new Date()): Promise<{ status: "linked" | "pending" | "none"; masked: string | null }> {
  const row = await getDb().notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel } } });
  if (!row || row.revokedAt || !row.addressEnc) return { status: "none", masked: null };
  const number = openSecret(ADDRESS_PURPOSE, row.addressEnc);
  const masked = number ? `••• ${number.slice(-3)}` : null;
  if (row.verifiedAt) return { status: "linked", masked };
  if (row.linkExpiresAt && row.linkExpiresAt > now) return { status: "pending", masked };
  return { status: "none", masked: null };
}
