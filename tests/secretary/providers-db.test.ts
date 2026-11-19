/**
 * #292 — Sekreter sağlayıcıları (tasks, calendar, meetings) için gerçek veritabanı ile
 * yetki / kimlik / sınır testleri. Yalnız izole test veritabanında çalışır (CI: AI_TEST_DATABASE_URL).
 * Sabit tarihler 2031'dedir; böylece diğer test verileriyle çakışmaz. Tüm kayıtlar finally'de silinir.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { secretary as calendarSecretary } from "@/modules/calendar/secretary";
import { secretary as meetingsSecretary } from "@/modules/meetings/secretary";
import { secretary as tasksSecretary } from "@/modules/tasks/secretary";
import { getDb } from "@/shared/db";
import type { Role } from "@/shared/roles";
import type { BriefingItem, ModuleSecretary, SecretaryContext } from "@/shared/secretary/define";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) {
  throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");
}

const tag = `sec-${randomUUID().slice(0, 8)}`;
const t: SecretaryContext["t"] = (key, values) => `${key}${values?.count !== undefined ? `:${values.count}` : ""}`;

async function collect(definition: ModuleSecretary, user: { id: string; role: Role }, now: Date): Promise<BriefingItem[]> {
  const items: BriefingItem[] = [];
  for (const provider of definition.providers) items.push(...(await provider.collect({ user, now, t })));
  return items;
}
const countOf = (items: BriefingItem[], id: string) => items.find((item) => item.id === id)?.count ?? 0;

async function createUser(overrides: { email?: string; isActive?: boolean } = {}) {
  return getDb().user.create({
    data: {
      name: `Test ${tag}`,
      email: overrides.email ?? `${randomUUID()}@${tag}.example.test`,
      passwordHash: "x",
      role: "ADMIN",
      isActive: overrides.isActive ?? true,
    },
    select: { id: true, email: true },
  });
}

let memberSequence = 900_000 + Math.floor(Math.random() * 90_000);
async function createMember(email: string, deleted = false) {
  memberSequence += 1;
  return getDb().member.create({
    data: {
      year: 2031,
      sequence: memberSequence,
      membershipNumber: `${tag}-${memberSequence}`,
      firstName: "Test",
      lastName: tag,
      email,
      joinDate: new Date("2030-01-01T00:00:00Z"),
      createdById: "test",
      createdByLabel: "test",
      ...(deleted ? { deletedAt: new Date() } : {}),
    },
    select: { id: true },
  });
}

test("tasks: yalnız kullanıcının kendi görevleri sayılır; isimler özete çıkmaz", { skip: !enabled }, async () => {
  const db = getDb();
  const userIds: string[] = [];
  const memberIds: string[] = [];
  try {
    const email = `owner-${randomUUID()}@${tag}.example.test`;
    const user = await createUser({ email });
    const other = await createUser();
    userIds.push(user.id, other.id);
    const ownMember = await createMember(email.toUpperCase()); // e-posta eşleşmesi büyük/küçük harf duyarsız
    const deletedMember = await createMember(email, true); // silinmiş üye kaydı eşleşmez
    const strangerMember = await createMember(`stranger-${randomUUID()}@${tag}.example.test`);
    memberIds.push(ownMember.id, deletedMember.id, strangerMember.id);

    // Berlin günü: 2031-01-15 23:30Z → yerel 2031-01-16 00:30 (kış saati).
    const now = new Date("2031-01-15T23:30:00Z");
    const today = new Date("2031-01-16T00:00:00Z");
    const past = new Date("2031-01-10T00:00:00Z");
    const secret = `GIZLI-${tag}`;
    await db.task.createMany({
      data: [
        { title: `${secret} atanmış`, status: "OPEN", dueDate: past, memberId: ownMember.id, memberName: secret },
        { title: `${secret} oluşturduğum`, status: "IN_PROGRESS", dueDate: today, createdById: user.id, memberId: strangerMember.id },
        { title: `${secret} bitti`, status: "DONE", dueDate: past, memberId: ownMember.id },
        { title: `${secret} silinmiş üye`, status: "OPEN", dueDate: past, memberId: deletedMember.id },
        { title: `${secret} başkası`, status: "OPEN", dueDate: past, memberId: strangerMember.id, createdById: other.id },
      ],
    });

    const items = await collect(tasksSecretary, { id: user.id, role: "ADMIN" }, now);
    assert.equal(countOf(items, "tasks:overdue"), 1, "yalnız kendi üye kaydına atanmış, açık, geçmiş görev");
    assert.equal(countOf(items, "tasks:due-today"), 1, "Berlin gününe göre bugün (UTC'de hâlâ dün)");
    assert.ok(!JSON.stringify(items).includes(secret), "görev başlığı veya üye adı özete çıkmaz");

    // Başka kullanıcı: yalnız kendi oluşturduğu (stranger'a atanmış) görevi görür; benimkileri görmez.
    const otherItems = await collect(tasksSecretary, { id: other.id, role: "ADMIN" }, now);
    assert.equal(countOf(otherItems, "tasks:overdue"), 1);
    assert.equal(countOf(otherItems, "tasks:due-today"), 0);

    // Pasif hesap: hiçbir şey sayılmaz.
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    assert.deepEqual(await collect(tasksSecretary, { id: user.id, role: "ADMIN" }, now), []);
  } finally {
    await db.task.deleteMany({ where: { title: { startsWith: "GIZLI-" + tag } } });
    await db.member.deleteMany({ where: { id: { in: memberIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

test("calendar: kendi kişisel + etkin ortak takvim; başkasının kişisel ve kapalı takvim sayılmaz", { skip: !enabled }, async () => {
  const db = getDb();
  const calendarIds: string[] = [];
  try {
    const me = `user-${randomUUID()}`;
    const someone = `user-${randomUUID()}`;
    const mine = await db.calendar.create({ data: { kind: "PERSONAL", name: tag, ownerId: me }, select: { id: true } });
    const theirs = await db.calendar.create({ data: { kind: "PERSONAL", name: tag, ownerId: someone }, select: { id: true } });
    const shared = await db.calendar.create({ data: { kind: "SHARED", name: tag }, select: { id: true } });
    const closed = await db.calendar.create({ data: { kind: "SHARED", name: tag, isActive: false }, select: { id: true } });
    calendarIds.push(mine.id, theirs.id, shared.id, closed.id);

    // Yaz saati günü: 2031-07-10 (CEST, UTC+2). "now" yerel 08:00.
    const now = new Date("2031-07-10T06:00:00Z");
    const entry = (calendarId: string, startsAt: string, endsAt: string, extra: Record<string, unknown> = {}) => ({
      calendarId, title: `GIZLI-${tag}`, startsAt: new Date(startsAt), endsAt: new Date(endsAt), createdById: "test", createdByLabel: "test", ...extra,
    });
    await db.calendarEntry.createMany({
      data: [
        // Bugün, kişisel: 10:00–11:00 ve 10:30–11:30 yerel → 1 çakışma.
        entry(mine.id, "2031-07-10T08:00:00Z", "2031-07-10T09:00:00Z"),
        entry(mine.id, "2031-07-10T08:30:00Z", "2031-07-10T09:30:00Z"),
        // Bugün, ortak takvim: çakışmaz (14:00 yerel).
        entry(shared.id, "2031-07-10T12:00:00Z", "2031-07-10T13:00:00Z"),
        // Yarın, gece yarısına yakın: 23:30 yerel = 21:30Z aynı gün UTC → yine de "yarın" (11 Temmuz).
        entry(mine.id, "2031-07-11T21:30:00Z", "2031-07-11T21:45:00Z"),
        // Bugün 00:30 yerel = önceki gün 22:30Z → Berlin'e göre bugün.
        entry(shared.id, "2031-07-09T22:30:00Z", "2031-07-09T22:45:00Z"),
        // Tüm gün, yalnız bugün.
        entry(mine.id, "2031-07-10T00:00:00Z", "2031-07-11T00:00:00Z", { allDay: true }),
        // Sayılmamalı: başkasının kişisel takvimi ve kapalı ortak takvim.
        entry(theirs.id, "2031-07-10T08:00:00Z", "2031-07-10T09:00:00Z"),
        entry(closed.id, "2031-07-10T08:00:00Z", "2031-07-10T09:00:00Z"),
      ],
    });

    const items = await collect(calendarSecretary, { id: me, role: "ADMIN" }, now);
    assert.equal(countOf(items, "calendar:today"), 5, "kişisel 2 + ortak 2 (biri UTC'de dün) + tüm gün 1");
    assert.equal(countOf(items, "calendar:tomorrow"), 1);
    assert.equal(countOf(items, "calendar:collisions"), 1);
    assert.ok(!JSON.stringify(items).includes("GIZLI"), "başlık özete çıkmaz");

    // Başkası: benim kişisel takvimimi görmez, kendi kişisel + ortak takvimi görür.
    const otherItems = await collect(calendarSecretary, { id: someone, role: "ADMIN" }, now);
    assert.equal(countOf(otherItems, "calendar:today"), 3, "kendi 1 + ortak 2");
    assert.equal(countOf(otherItems, "calendar:collisions"), 0);
  } finally {
    await db.calendar.deleteMany({ where: { id: { in: calendarIds } } });
  }
});

test("calendar: tekrarlayan etkinlik ve yaz saatine geçiş günü", { skip: !enabled }, async () => {
  const db = getDb();
  const calendarIds: string[] = [];
  try {
    const me = `user-${randomUUID()}`;
    const mine = await db.calendar.create({ data: { kind: "PERSONAL", name: tag, ownerId: me }, select: { id: true } });
    calendarIds.push(mine.id);
    // Günlük tekrar, başlangıç 2031-03-01 09:00 yerel (CET = 08:00Z). Yaz saatine geçiş: 30.03.2031.
    await db.calendarEntry.create({
      data: {
        calendarId: mine.id, title: `GIZLI-${tag}`, startsAt: new Date("2031-03-01T08:00:00Z"), endsAt: new Date("2031-03-01T09:00:00Z"),
        recurrence: "DAILY", recurrenceInterval: 1, createdById: "test", createdByLabel: "test",
      },
    });
    const now = new Date("2031-03-30T05:00:00Z"); // yerel 07:00 CEST
    const items = await collect(calendarSecretary, { id: me, role: "ADMIN" }, now);
    assert.equal(countOf(items, "calendar:today"), 1, "geçiş gününde tam bir oluşum");
    assert.equal(countOf(items, "calendar:tomorrow"), 1);
  } finally {
    await db.calendar.deleteMany({ where: { id: { in: calendarIds } } });
  }
});

test("meetings: 3 günlük pencere, silinmiş/iptal hariç, gündemsiz toplantılar", { skip: !enabled }, async () => {
  const db = getDb();
  const ids: string[] = [];
  let sequence = 900_000 + Math.floor(Math.random() * 90_000);
  async function meeting(date: string, extra: Record<string, unknown> = {}, agenda = false) {
    sequence += 1;
    const row = await db.meeting.create({
      data: {
        year: 2031, sequence, meetingNumber: `${tag}-${sequence}`, type: "BOARD", title: `GIZLI-${tag}`,
        meetingDate: new Date(`${date}T00:00:00Z`), createdById: "test", createdByLabel: "test", ...extra,
        ...(agenda ? { agendaItems: { create: [{ position: 1, title: "x" }] } } : {}),
      },
      select: { id: true },
    });
    ids.push(row.id);
  }
  try {
    const meetingTypes = await db.$queryRaw<{ value: string }[]>`SELECT unnest(enum_range(NULL::"MeetingType"))::text AS value`;
    assert.ok(meetingTypes.some((row) => row.value === "BOARD"), "test BOARD toplantı türünü varsayar");
    // Berlin günü 2031-11-20; now = 2031-11-19 23:30Z (yerel 20.11 00:30).
    const now = new Date("2031-11-19T23:30:00Z");
    await meeting("2031-11-20", {}, true); // bugün, gündemli
    await meeting("2031-11-22"); // pencere sonu (dahil), gündemsiz
    await meeting("2031-11-23"); // pencere dışı
    await meeting("2031-11-19"); // dün (UTC'ye göre "bugün" olurdu)
    await meeting("2031-11-21", { deletedAt: new Date() });
    await meeting("2031-11-21", { status: "CANCELLED" });

    const items = await collect(meetingsSecretary, { id: "u", role: "ADMIN" }, now);
    assert.equal(countOf(items, "meetings:upcoming"), 2);
    assert.equal(countOf(items, "meetings:missing-agenda"), 1);
    assert.ok(!JSON.stringify(items).includes("GIZLI"));
  } finally {
    await db.meeting.deleteMany({ where: { id: { in: ids } } });
  }
});
