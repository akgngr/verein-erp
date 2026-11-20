/**
 * N1a (#354) — bildirim çekirdeği: yetki/etkinlik gönderimde ve okumada yeniden denetlenir, idempotent, kullanıcı
 * yalıtımı, okundu/ertele/kapat, 90 gün saklama, parametreler şifreli. Gerçek DB (CI: AI_TEST_DATABASE_URL).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { z } from "zod";

import { findType, type NotifyDeps } from "@/modules/notifications/services/inbox";
import { getDb } from "@/shared/db";
import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";
import { definePermissions } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

const perms = definePermissions("demo", { ADMIN: ["view"], BOARD: ["view"], SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] });
const assigned = defineNotificationType({
  key: "assigned",
  severity: "warning",
  defaultChannels: ["in_app"],
  permission: { definition: perms, action: "view" },
  schema: z.object({ taskId: z.string().regex(/^[a-z0-9-]+$/), title: z.string().max(120) }).strict(),
  titleKey: "notifications.assigned.title",
  href: (params) => `/tasks/${params.taskId}`,
});
const evil = defineNotificationType({ ...assigned, key: "evil", href: () => "https://evil.test/x" } as never);
const registry = [defineNotificationTypes("tasks", [assigned, evil])];

test("findType: modül.tür çözümü", () => {
  assert.equal(findType(registry, "tasks.assigned")?.type.key, "assigned");
  assert.equal(findType(registry, "tasks.none"), null);
  assert.equal(findType(registry, "assigned"), null);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: gönderim, yalıtım, okuma yetkisi, okundu/ertele/kapat, saklama", { skip: !enabled }, async () => {
  const db = getDb();
  const svc = await import("@/modules/notifications/services/inbox");
  const tag = `nt-${randomUUID().slice(0, 8)}`;
  const mk = (role: Role, isActive = true) => db.user.create({ data: { name: tag, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role, isActive } });
  const admin = await mk("ADMIN");
  const board = await mk("BOARD");
  const viewer = await mk("VIEWER");
  const inactive = await mk("ADMIN", false);
  const users = new Map([admin, board, viewer, inactive].map((u) => [u.id, { id: u.id, role: u.role as Role, isActive: u.isActive }]));
  let usable = ["tasks"];
  const deps: NotifyDeps = { registry, usableModules: async () => usable, loadUser: async (id) => users.get(id) ?? null };
  const t = async () => (key: string, values?: Record<string, string | number>) => `${key}|${values?.title ?? ""}`;
  const send = (ref: string, recipients = [admin.id, board.id, viewer.id, inactive.id]) =>
    svc.notify({ type: "tasks.assigned", recipients, ref, params: { taskId: "t-1", title: "Rapor hazırla" } }, deps);
  try {
    // Yetkisiz (VIEWER) ve pasif alıcı atlanır; idempotent.
    assert.equal(await send(`${tag}:1`), 2);
    assert.equal(await send(`${tag}:1`), 0, "aynı olay ikinci kez yok");
    assert.equal(await db.notification.count({ where: { userId: viewer.id } }), 0);
    // Parametreler şifreli.
    const stored = await db.notification.findFirstOrThrow({ where: { userId: admin.id } });
    assert.ok(stored.paramsEnc && !stored.paramsEnc.includes("Rapor"));
    // Geçersiz tür/parametre/ref reddedilir.
    await assert.rejects(() => svc.notify({ type: "tasks.none", recipients: [admin.id], ref: "x", params: {} }, deps), /TYPE_UNKNOWN/);
    await assert.rejects(() => svc.notify({ type: "tasks.assigned", recipients: [admin.id], ref: "x", params: { taskId: "t-1", title: "x", extra: 1 } }, deps), /PARAMS_INVALID/);
    await assert.rejects(() => svc.notify({ type: "tasks.assigned", recipients: [admin.id], ref: "a b", params: { taskId: "t-1", title: "x" } }, deps), /REF_INVALID/);
    // Modül kapalıysa gönderim yok, listede görünmez.
    usable = [];
    assert.equal(await send(`${tag}:2`), 0);
    assert.deepEqual(await svc.listNotifications({ id: admin.id, role: "ADMIN" }, {}, t, deps), []);
    usable = ["tasks"];

    // Liste: yalnız kendi; metin okunurken; güvenli bağlantı; dış bağlantı düşer.
    await svc.notify({ type: "tasks.evil", recipients: [admin.id], ref: `${tag}:evil`, params: { taskId: "t-2", title: "x" } }, deps);
    const list = await svc.listNotifications({ id: admin.id, role: "ADMIN" }, {}, t, deps);
    assert.equal(list.length, 2);
    assert.equal(list.find((n) => n.typeKey === "tasks.assigned")?.title, "notifications.assigned.title|Rapor hazırla");
    assert.equal(list.find((n) => n.typeKey === "tasks.assigned")?.href, "/tasks/t-1");
    assert.equal(list.find((n) => n.typeKey === "tasks.evil")?.href, null);
    // Okuma anında yetki: rolü düşen kullanıcı görmez.
    assert.deepEqual(await svc.listNotifications({ id: board.id, role: "VIEWER" }, {}, t, deps), []);

    // Okundu / tümünü okundu; başkasının kaydı değişmez.
    const mine = list[0].id;
    assert.equal(await svc.markRead(board.id, [mine]), 0, "başkasının bildirimi işaretlenemez");
    assert.equal(await svc.markRead(admin.id, [mine]), 1);
    assert.equal(await svc.unreadCount(admin.id), 1);
    assert.equal(await svc.markAllRead(admin.id), 1);
    assert.equal(await svc.unreadCount(admin.id), 0);

    // Ertele ve kapat.
    const now = new Date();
    await assert.rejects(() => svc.snooze(admin.id, mine, new Date(now.getTime() + 31 * 86_400_000), now), /snoozeRange/);
    await assert.rejects(() => svc.snooze(board.id, mine, new Date(now.getTime() + 3_600_000), now), /notFound/);
    await svc.snooze(admin.id, mine, new Date(now.getTime() + 3_600_000), now);
    assert.equal((await svc.listNotifications({ id: admin.id, role: "ADMIN" }, {}, t, deps, now)).length, 1, "ertelenen gizli");
    await svc.dismiss(admin.id, list[1].id, now);
    assert.equal((await svc.listNotifications({ id: admin.id, role: "ADMIN" }, {}, t, deps, now)).length, 0);

    // Saklama: 90 günden eski silinir.
    await db.notification.updateMany({ where: { userId: board.id }, data: { createdAt: new Date(now.getTime() - 91 * 86_400_000) } });
    assert.ok((await svc.purgeExpired(now)) >= 1);
    assert.equal(await db.notification.count({ where: { userId: board.id } }), 0);
  } finally {
    await db.notification.deleteMany({ where: { userId: { in: [...users.keys()] } } });
    await db.user.deleteMany({ where: { id: { in: [...users.keys()] } } });
  }
});
