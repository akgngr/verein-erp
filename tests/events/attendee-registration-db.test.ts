import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { changeAttendeeStatus, registerAttendee } from "@/modules/events/services/attendee-registration";

// #584: Kontenjan ve mükerrer kayıt, eşzamanlı isteklerde de aşılmaz. Veritabanı gerektirir (sentetik veri).
const enabled = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

async function withEvent(capacity: number | null, run: (eventId: string) => Promise<void>) {
  const db = getDb();
  const event = await db.event.create({
    data: { title: `Test ${randomUUID()}`, startDate: new Date("2030-01-01T10:00:00Z"), status: "PUBLISHED", capacity },
    select: { id: true },
  });
  try {
    await run(event.id);
  } finally {
    await db.eventAttendee.deleteMany({ where: { eventId: event.id } });
    await db.event.delete({ where: { id: event.id } });
  }
}

const guest = (eventId: string, n: number) => ({ eventId, memberId: null, firstName: `Gast${n}`, lastName: "Muster", email: null });

test("concurrent registrations never exceed capacity", { skip: !enabled }, async () => {
  await withEvent(2, async (eventId) => {
    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => registerAttendee(guest(eventId, n))));
    assert.equal(results.filter((r) => r.ok).length, 2);
    assert.equal(results.filter((r) => !r.ok && r.reason === "full").length, 3);
    assert.equal(await getDb().eventAttendee.count({ where: { eventId, status: { not: "CANCELLED" } } }), 2);
  });
});

test("the same member cannot hold two active registrations", { skip: !enabled }, async () => {
  await withEvent(null, async (eventId) => {
    const memberId = `member-${randomUUID()}`;
    const input = { eventId, memberId, firstName: "Anna", lastName: "Muster", email: null };
    const [a, b] = await Promise.all([registerAttendee(input), registerAttendee(input)]);
    assert.equal([a, b].filter((r) => r.ok).length, 1);
    assert.ok([a, b].some((r) => !r.ok && r.reason === "alreadyRegistered"));
  });
});

test("re-activating a cancelled registration respects capacity", { skip: !enabled }, async () => {
  await withEvent(1, async (eventId) => {
    const first = await registerAttendee(guest(eventId, 1));
    assert.ok(first.ok);
    const cancelled = await registerAttendee({ ...guest(eventId, 2), status: "CANCELLED" });
    assert.ok(cancelled.ok);
    const reactivate = await changeAttendeeStatus(cancelled.ok ? cancelled.id : "", "REGISTERED");
    assert.deepEqual(reactivate, { ok: false, reason: "full" });
  });
});

test("soft-deleted and unpublished events reject portal registrations", { skip: !enabled }, async () => {
  await withEvent(null, async (eventId) => {
    await getDb().event.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
    assert.deepEqual(await registerAttendee(guest(eventId, 1), { publishedOnly: true }), { ok: false, reason: "notFound" });
  });
});
