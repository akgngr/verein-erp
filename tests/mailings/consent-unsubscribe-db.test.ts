import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/shared/db";

// #581: Telegram /start tek kullanımlık ve rıza eşitlemesi; tek tıkla çıkış (veritabanı gerektirir, sentetik veri).
const enabled = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

async function withMember(run: (memberId: string) => Promise<void>) {
  const db = getDb();
  const id = randomUUID();
  const member = await db.member.create({
    data: { year: 2096, sequence: Math.floor(Math.random() * 1e8), membershipNumber: id, firstName: "Consent", lastName: "Sentinel", joinDate: new Date("2096-01-01"), createdById: id, createdByLabel: "Test", messagingConsents: [] },
    select: { id: true },
  });
  try {
    await run(member.id);
  } finally {
    await db.campaignTelegramLink.deleteMany({ where: { recipientKey: `members:members:${member.id}` } });
    await db.member.delete({ where: { id: member.id } });
  }
}

test("telegram /start links once, rotates the token and records consent; /stop revokes it", { skip: !enabled }, async () => {
  const { handleUpdate } = await import("@/modules/campaign-telegram/services/telegram");
  const { recordChannelConsent } = await import("@/modules/mailings/services/channel-consent");
  const db = getDb();
  await withMember(async (memberId) => {
    const recipientKey = `members:members:${memberId}`;
    const token = randomBytes(18).toString("base64url");
    await db.campaignTelegramLink.create({ data: { recipientKey, token } });
    const consent = (key: string, granted: boolean) => recordChannelConsent(key, "telegram", granted, "Test");

    assert.equal(await handleUpdate({ message: { chat: { id: 1001 }, text: `/start ${token}` } }, consent), "linked");
    const linked = await db.campaignTelegramLink.findUnique({ where: { recipientKey } });
    assert.equal(linked?.chatId, "1001");
    assert.notEqual(linked?.token, token, "token rotated after first use");
    assert.deepEqual((await db.member.findUnique({ where: { id: memberId } }))?.messagingConsents, ["telegram"]);

    // A forwarded old link cannot re-bind the subscription to another chat.
    assert.equal(await handleUpdate({ message: { chat: { id: 2002 }, text: `/start ${token}` } }, consent), "unknown");
    assert.equal((await db.campaignTelegramLink.findUnique({ where: { recipientKey } }))?.chatId, "1001");

    assert.equal(await handleUpdate({ message: { chat: { id: 1001 }, text: "/stop" } }, consent), "stopped");
    assert.equal((await db.campaignTelegramLink.findUnique({ where: { recipientKey } }))?.chatId, null);
    assert.deepEqual((await db.member.findUnique({ where: { id: memberId } }))?.messagingConsents, []);
  });
});

test("one-click unsubscribe sets bulkMailOptOut via the delivery token", { skip: !enabled }, async () => {
  const { unsubscribeByToken } = await import("@/modules/mailings/services/channel-consent");
  const db = getDb();
  await withMember(async (memberId) => {
    const campaign = await db.mailingCampaign.create({ data: { source: "members:members", filter: {}, subject: "T", body: "B", createdById: "test", createdByLabel: "Test" }, select: { id: true } });
    const token = randomBytes(18).toString("base64url");
    await db.mailingDelivery.create({ data: { campaignId: campaign.id, channel: "email", address: `${randomUUID()}@example.org`, token, recipientKey: `members:members:${memberId}` } });
    try {
      assert.equal(await unsubscribeByToken(token), "done");
      assert.equal((await db.member.findUnique({ where: { id: memberId } }))?.bulkMailOptOut, true);
      assert.equal(await unsubscribeByToken(token), "done", "idempotent");
      assert.equal(await unsubscribeByToken("x".repeat(24)), "unknown");
    } finally {
      await db.mailingDelivery.deleteMany({ where: { campaignId: campaign.id } });
      await db.mailingCampaign.delete({ where: { id: campaign.id } });
    }
  });
});

test("late FAILED reports: counters come from persisted statuses (finished) and are left to the worker (sending)", { skip: !enabled }, async () => {
  const { recordProviderStatus } = await import("@/modules/mailings/services/tracking");
  const db = getDb();
  const make = async (status: "DONE" | "SENDING") => {
    const campaign = await db.mailingCampaign.create({ data: { source: "members:members", channel: "sms", filter: {}, subject: "T", body: "B", sentCount: 2, failedCount: 0, status, createdById: "test", createdByLabel: "Test" }, select: { id: true } });
    const providerId = `p-${randomUUID()}`;
    await db.mailingDelivery.createMany({
      data: [
        { campaignId: campaign.id, channel: "sms", address: `+49${randomUUID().slice(0, 8)}`, token: randomBytes(18).toString("base64url"), status: "SENT", providerId },
        { campaignId: campaign.id, channel: "sms", address: `+49${randomUUID().slice(0, 8)}`, token: randomBytes(18).toString("base64url"), status: "DELIVERED", providerId: `p-${randomUUID()}` },
      ],
    });
    return { id: campaign.id, providerId };
  };
  const done = await make("DONE");
  const sending = await make("SENDING");
  try {
    await recordProviderStatus({ channel: "sms", providerId: done.providerId, status: "FAILED", error: "TEST" });
    await recordProviderStatus({ channel: "sms", providerId: done.providerId, status: "FAILED", error: "TEST" });
    assert.deepEqual(await db.mailingCampaign.findUnique({ where: { id: done.id }, select: { sentCount: true, failedCount: true } }), { sentCount: 1, failedCount: 1 });

    await recordProviderStatus({ channel: "sms", providerId: sending.providerId, status: "FAILED", error: "TEST" });
    assert.deepEqual(await db.mailingCampaign.findUnique({ where: { id: sending.id }, select: { sentCount: true, failedCount: true } }), { sentCount: 2, failedCount: 0 }, "worker recounts at the end");
    assert.equal((await db.mailingDelivery.findFirst({ where: { providerId: sending.providerId } }))?.status, "FAILED", "status is persisted for the worker's recount");
  } finally {
    for (const id of [done.id, sending.id]) {
      await db.mailingDelivery.deleteMany({ where: { campaignId: id } });
      await db.mailingCampaign.delete({ where: { id } });
    }
  }
});

test("a failed consent write keeps the /start token usable for a retry", { skip: !enabled }, async () => {
  const { handleUpdate } = await import("@/modules/campaign-telegram/services/telegram");
  const db = getDb();
  await withMember(async (memberId) => {
    const recipientKey = `members:members:${memberId}`;
    const token = randomBytes(18).toString("base64url");
    await db.campaignTelegramLink.create({ data: { recipientKey, token } });
    const update = { message: { chat: { id: 3003 }, text: `/start ${token}` } };
    await assert.rejects(handleUpdate(update, async () => { throw new Error("DB_DOWN"); }));
    const untouched = await db.campaignTelegramLink.findUnique({ where: { recipientKey } });
    assert.equal(untouched?.token, token);
    assert.equal(untouched?.chatId, null);
    assert.equal(await handleUpdate(update, async () => true), "linked", "retry succeeds");
  });
});
