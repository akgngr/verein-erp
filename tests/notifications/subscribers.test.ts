/**
 * N8a (#375) — abone görünümü: kanal durumu, süzgeçler, özet; ham adres/uç nokta/sohbet kimliği yanıtta yok;
 * yönetici kaldırması.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/shared/db";
import { sealSecret } from "@/shared/security/secret-box";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: durumlar, süzgeçler, gizlilik, kaldırma", { skip: !enabled }, async () => {
  const db = getDb();
  const svc = await import("@/modules/notifications/services/subscribers");
  const tag = `sb-${randomUUID().slice(0, 8)}`;
  const mk = (name: string) => db.user.create({ data: { name: `${tag}-${name}`, email: `${name}-${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const [a, b, c] = await Promise.all([mk("a"), mk("b"), mk("c")]);
  const ids = [a.id, b.id, c.id];
  const directory = async (o: { q?: string; skip: number; take: number; ids?: readonly string[] }) => {
    const all = [a, b, c].filter((u) => (!o.ids || o.ids.includes(u.id)) && (!o.q || u.name.includes(o.q)));
    return { rows: all.slice(o.skip, o.skip + o.take).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive })), total: all.length };
  };
  try {
    await db.notificationChannelLink.create({ data: { userId: a.id, channel: "telegram", addressEnc: sealSecret("notification-channel-address", "999111"), addressHash: "h", verifiedAt: new Date() } });
    await db.notificationPushSubscription.createMany({ data: [1, 2].map((i) => ({ userId: b.id, endpointHash: `${tag}-${i}`, endpointEnc: sealSecret("notification-push-subscription", `https://fcm.googleapis.com/${tag}/${i}`), keysEnc: "x" })) });
    await db.notificationPreference.create({ data: { userId: c.id, typeKey: "*", channel: "email", enabled: false } });

    const all = await svc.listSubscribers({ page: 1, pageSize: 10 }, directory);
    const byId = new Map(all.rows.map((r) => [r.userId, r.channels]));
    assert.deepEqual(byId.get(a.id), { email: "default", telegram: "linked", webPushDevices: 0 });
    assert.deepEqual(byId.get(b.id), { email: "default", telegram: "none", webPushDevices: 2 });
    assert.deepEqual(byId.get(c.id), { email: "off", telegram: "none", webPushDevices: 0 });
    const json = JSON.stringify(all);
    assert.ok(!json.includes("999111") && !json.includes("fcm.googleapis.com"), "adres/uç nokta yok");

    assert.deepEqual((await svc.listSubscribers({ channel: "telegram", page: 1, pageSize: 10 }, directory)).rows.map((r) => r.userId).filter((id) => ids.includes(id)), [a.id]);
    assert.deepEqual((await svc.listSubscribers({ channel: "web_push", page: 1, pageSize: 10 }, directory)).rows.map((r) => r.userId).filter((id) => ids.includes(id)), [b.id]);
    assert.deepEqual((await svc.listSubscribers({ channel: "email_off", page: 1, pageSize: 10 }, directory)).rows.map((r) => r.userId).filter((id) => ids.includes(id)), [c.id]);

    assert.equal(await svc.removeSubscriberChannel(b.id, "web_push"), 2);
    assert.equal(await svc.removeSubscriberChannel(a.id, "telegram"), 1);
    assert.equal(await svc.removeSubscriberChannel(a.id, "telegram"), 0);
    const after = await svc.channelStates([a.id, b.id]);
    assert.equal(after.get(a.id)?.telegram, "none");
    assert.equal(after.get(b.id)?.webPushDevices, 0);
  } finally {
    await db.notificationPushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await db.notificationChannelLink.deleteMany({ where: { userId: { in: ids } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
