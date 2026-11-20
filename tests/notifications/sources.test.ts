/**
 * N1c (#356) — ilk kaynaklar: görev atama (üye e-postası → kullanıcı, atayan hariç), toplantı daveti,
 * sekreter önerisi, gelen posta sınıflaması. Kayıt ve gizlilik.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { moduleNotificationRegistry } from "@/notification-registry";
import { getDb } from "@/shared/db";
import { validateModuleNotifications } from "@/shared/notifications/define";

test("kaynaklar kayıtta ve sözleşmeye uygun", () => {
  const keys = moduleNotificationRegistry.flatMap((entry) => entry.types.map((type) => `${entry.module}.${type.key}`)).sort();
  for (const key of ["mail.triage", "meetings.invited", "secretary.proposal", "tasks.assigned"]) assert.ok(keys.includes(key), key);
  for (const entry of moduleNotificationRegistry) assert.deepEqual(validateModuleNotifications(entry.module, entry), [], entry.module);
});

test("mail.triage gönderen/konu taşımaz; yalnız sınıf", () => {
  const mail = moduleNotificationRegistry.find((entry) => entry.module === "mail")!.types[0];
  assert.equal(mail.schema.safeParse({ category: "question" }).success, true);
  assert.equal(mail.schema.safeParse({ category: "question", subject: "x" }).success, false);
  assert.equal(mail.schema.safeParse({ category: "question", from: "a@b.test" }).success, false);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: görev atama — üye e-postasına karşılık gelen etkin kullanıcı; atayan ve pasif kullanıcı hariç", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `ns-${randomUUID().slice(0, 8)}`;
  const email = `${tag}@example.test`;
  const assignee = await db.user.create({ data: { name: tag, email, passwordHash: "x", role: "ADMIN", isActive: true } });
  const actor = await db.user.create({ data: { name: tag, email: `actor-${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const member = await db.member.findFirst({ where: { deletedAt: null }, select: { id: true, email: true } });
  if (!member) return; // test veritabanında üye yoksa atla
  const before = member.email;
  const { notifyTaskAssignee } = await import("@/modules/tasks/services/notify-assignee");
  const { getModuleAvailability } = await import("@/modules/system/automation");
  try {
    await db.member.update({ where: { id: member.id }, data: { email: email.toUpperCase() } });
    await notifyTaskAssignee({ id: `${tag}-t`, title: "Rapor", memberId: member.id }, actor.id);
    const usable = (await getModuleAvailability("tasks")) === "available";
    assert.equal(await db.notification.count({ where: { userId: assignee.id, typeKey: "tasks.assigned" } }), usable ? 1 : 0);
    assert.equal(await db.notification.count({ where: { userId: actor.id } }), 0);
    // Atayan kendisiyse bildirim yok.
    await notifyTaskAssignee({ id: `${tag}-t2`, title: "Rapor", memberId: member.id }, assignee.id);
    assert.equal(await db.notification.count({ where: { userId: assignee.id, refKey: { contains: `${tag}-t2` } } }), 0);
    // Pasif kullanıcı eşleşmez.
    await db.user.update({ where: { id: assignee.id }, data: { isActive: false } });
    await notifyTaskAssignee({ id: `${tag}-t3`, title: "Rapor", memberId: member.id }, actor.id);
    assert.equal(await db.notification.count({ where: { userId: assignee.id, refKey: { contains: `${tag}-t3` } } }), 0);
  } finally {
    await db.member.update({ where: { id: member.id }, data: { email: before } });
    await db.notification.deleteMany({ where: { userId: { in: [assignee.id, actor.id] } } });
    await db.user.deleteMany({ where: { id: { in: [assignee.id, actor.id] } } });
  }
});
