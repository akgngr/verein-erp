/**
 * N1d (#374) — kitle: herkese / role göre; tür yetkisi kişi başına; tekrar yok; alıcı ve kitle birlikte verilemez.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { z } from "zod";

import type { NotifyDeps } from "@/modules/notifications/services/inbox";
import { getDb } from "@/shared/db";
import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";
import { definePermissions } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: herkese ve role göre; yetkisiz rol hariç; tekrar yok", { skip: !enabled }, async () => {
  const db = getDb();
  const { notify } = await import("@/modules/notifications/services/inbox");
  const perms = definePermissions("demo", { ADMIN: ["view"], BOARD: ["view"], SECRETARY: ["view"], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] });
  const registry = [defineNotificationTypes("notifications", [defineNotificationType({ key: "announcement", severity: "info", defaultChannels: ["in_app"], permission: { definition: perms, action: "view" }, schema: z.object({ title: z.string() }).strict(), titleKey: "notifications.announcement.title", href: () => "/" })])];
  const tag = `au-${randomUUID().slice(0, 8)}`;
  const mk = (role: Role) => db.user.create({ data: { name: tag, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role, isActive: true } });
  const people = await Promise.all((["ADMIN", "BOARD", "SECRETARY", "VIEWER"] as Role[]).map(mk));
  const audience = people.map((u) => ({ id: u.id, role: u.role as Role }));
  const deps: NotifyDeps = {
    registry, usableModules: async () => ["notifications"], loadUser: async () => null,
    listAudience: async (roles) => audience.filter((u) => !roles || roles.includes(u.role)),
  };
  const count = (ref: string) => db.notification.count({ where: { refKey: ref, userId: { in: people.map((p) => p.id) } } });
  try {
    assert.equal(await notify({ type: "notifications.announcement", audience: { allWithPermission: true }, ref: `${tag}:all`, params: { title: "x" } }, deps), 3, "VIEWER yetkisiz");
    assert.equal(await notify({ type: "notifications.announcement", audience: { allWithPermission: true }, ref: `${tag}:all`, params: { title: "x" } }, deps), 0, "tekrar yok");
    assert.equal(await notify({ type: "notifications.announcement", audience: { roles: ["BOARD", "VIEWER"] }, ref: `${tag}:board`, params: { title: "x" } }, deps), 1);
    assert.equal(await count(`${tag}:board`), 1);
    assert.equal(await notify({ type: "notifications.announcement", audience: { roles: [] }, ref: `${tag}:none`, params: { title: "x" } }, deps), 0);
    await assert.rejects(() => notify({ type: "notifications.announcement", recipients: [people[0].id], audience: { allWithPermission: true }, ref: `${tag}:both`, params: { title: "x" } }, deps), /RECIPIENTS_INVALID/);
    await assert.rejects(() => notify({ type: "notifications.announcement", ref: `${tag}:neither`, params: { title: "x" } }, deps), /RECIPIENTS_INVALID/);
  } finally {
    await db.notification.deleteMany({ where: { userId: { in: people.map((p) => p.id) } } });
    await db.user.deleteMany({ where: { id: { in: people.map((p) => p.id) } } });
  }
});
