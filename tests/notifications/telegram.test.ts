/**
 * N4 (#361) — Telegram: token DB'de şifreli, tek kullanımlık ve süreli bağlama, yalnız özel sohbet, /stop,
 * webhook gizli başlığı, dağıtımda genel metin ve çift gönderim yok. Gerçek Telegram yok: sahte taşıyıcı.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { z } from "zod";

import { webhookSecret } from "@/modules/notifications/services/telegram";
import { getDb } from "@/shared/db";
import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";
import { definePermissions } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

const TOKEN = "123456789:AAAbbbCCCdddEEEfffGGGhhhIIIjjjKKKll";

test("webhook gizli değeri token'a bağlı ve sabit uzunlukta", () => {
  assert.equal(webhookSecret(TOKEN).length, 43);
  assert.notEqual(webhookSecret(TOKEN), webhookSecret(`${TOKEN}x`));
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: yapılandırma, bağlama, /stop, dağıtım", { skip: !enabled }, async () => {
  const db = getDb();
  const tg = await import("@/modules/notifications/services/telegram");
  const { runDispatch } = await import("@/modules/notifications/services/dispatch");
  const { notify } = await import("@/modules/notifications/services/inbox");
  const tag = `tg-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const before = await db.notificationChannelConfig.findUnique({ where: { channel: "telegram" } });
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  const transport = async <T,>(_token: string, method: string, body: unknown) => {
    calls.push({ method, body: body as Record<string, unknown> });
    return (method === "getMe" ? { username: "verein_test_bot" } : { message_id: calls.length }) as T;
  };
  const now = new Date();
  try {
    await assert.rejects(() => tg.configureTelegram({ enabled: true, botToken: "bad" }, "https://erp.example.test", user.id, transport), /telegramToken/);
    await assert.rejects(() => tg.configureTelegram({ enabled: true, botToken: TOKEN }, "http://erp.example.test", user.id, transport), /appUrl/);
    const configured = await tg.configureTelegram({ enabled: true, botToken: TOKEN }, "https://erp.example.test", user.id, transport);
    assert.equal(configured.botUsername, "verein_test_bot");
    const webhook = calls.find((c) => c.method === "setWebhook")!;
    assert.equal(webhook.body.url, "https://erp.example.test/api/notifications/telegram-webhook");
    assert.equal(webhook.body.secret_token, webhookSecret(TOKEN));
    const stored = await db.notificationChannelConfig.findUniqueOrThrow({ where: { channel: "telegram" } });
    assert.ok(stored.secretsEnc && !stored.secretsEnc.includes("AAAbbb"), "token şifreli");

    // Bağlama: tek kullanımlık, süreli, yalnız özel sohbet.
    const link = await tg.requestTelegramLink(user.id, now);
    const token = new URL(link.url).searchParams.get("start")!;
    assert.match(link.url, /^https:\/\/t\.me\/verein_test_bot\?start=/);
    assert.equal(await tg.handleTelegramUpdate({ message: { chat: { id: 1, type: "group" }, text: `/start ${token}` } }, now), "ignored");
    assert.equal(await tg.handleTelegramUpdate({ message: { chat: { id: 42, type: "private" }, text: `/start ${token}` } }, new Date(now.getTime() + 16 * 60_000)), "unknown", "süresi dolmuş");
    const fresh = new URL((await tg.requestTelegramLink(user.id, now)).url).searchParams.get("start")!;
    assert.equal(await tg.handleTelegramUpdate({ message: { chat: { id: 42, type: "private" }, text: `/start ${fresh}` } }, now), "linked");
    assert.equal(await tg.handleTelegramUpdate({ message: { chat: { id: 43, type: "private" }, text: `/start ${fresh}` } }, now), "unknown", "tek kullanımlık");
    assert.equal(await tg.telegramChatFor(user.id), "42");
    const row = await db.notificationChannelLink.findFirstOrThrow({ where: { userId: user.id } });
    assert.ok(row.addressEnc && row.addressEnc !== "42", "sohbet kimliği şifreli");

    // Dağıtım: Telegram tercihli tür → genel metin, tek gönderim.
    const perms = definePermissions("demo", { ADMIN: ["view"], BOARD: [], SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] });
    const registry = [defineNotificationTypes("meetings", [defineNotificationType({ key: "invited", severity: "info", defaultChannels: ["in_app", "telegram"], permission: { definition: perms, action: "view" }, schema: z.object({ title: z.string() }).strict(), titleKey: "notifications.invited.title", href: () => "/toplantilar" })])];
    const users = new Map([[user.id, { id: user.id, role: "ADMIN" as Role, isActive: true, email: null }]]);
    const deps = {
      registry, usableModules: async () => ["meetings"], loadUser: async (id: string) => users.get(id) ?? null,
      isMailConfigured: async () => false, sendMail: async () => ({ ok: false }), appUrl: "https://erp.example.test", locale: "tr" as const,
      telegram: { isAvailable: async () => true, chatFor: tg.telegramChatFor, send: (chatId: string, text: string) => tg.sendTelegram(chatId, text, transport) },
    };
    await notify({ type: "meetings.invited", recipients: [user.id], ref: `${tag}:1`, params: { title: "Gizli Başlık" } }, { registry, usableModules: deps.usableModules, loadUser: deps.loadUser });
    await Promise.all([runDispatch(now, deps), runDispatch(now, deps)]);
    const sends = calls.filter((c) => c.method === "sendMessage");
    assert.equal(sends.length, 1);
    assert.equal(sends[0].body.chat_id, "42");
    assert.ok(!String(sends[0].body.text).includes("Gizli"), "başlık gitmez");

    // /stop: bağ kalkar, sonraki gönderim yok.
    assert.equal(await tg.handleTelegramUpdate({ message: { chat: { id: 42, type: "private" }, text: "/stop" } }, now), "stopped");
    assert.equal(await tg.telegramChatFor(user.id), null);
  } finally {
    await db.notificationDelivery.deleteMany({ where: { userId: user.id } });
    await db.notification.deleteMany({ where: { userId: user.id } });
    await db.notificationChannelLink.deleteMany({ where: { userId: user.id } });
    if (before) await db.notificationChannelConfig.update({ where: { channel: "telegram" }, data: { enabled: before.enabled, secretsEnc: before.secretsEnc, settings: before.settings ?? undefined } });
    else await db.notificationChannelConfig.deleteMany({ where: { channel: "telegram" } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
