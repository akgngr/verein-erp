import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { berlinLocalToUtc, utcToBerlinLocalInput } from "@/modules/events/helpers/berlin-time";
import { attendeeAddSchema, eventCreateSchema, eventUpdateSchema, isEndBeforeStart } from "@/modules/events/schemas/event-schema";

// #584: Etkinlik doğrulaması ve Europe/Berlin saat dönüşümü (sentetik veri).
describe("events: Berlin wall time", () => {
  test("winter time (CET, UTC+1) and summer time (CEST, UTC+2)", () => {
    assert.equal(berlinLocalToUtc("2026-12-05T14:00")?.toISOString(), "2026-12-05T13:00:00.000Z");
    assert.equal(berlinLocalToUtc("2026-07-05T14:00")?.toISOString(), "2026-07-05T12:00:00.000Z");
  });

  test("DST transition days resolve deterministically", () => {
    // 29.03.2026 02:30 does not exist in Berlin; it moves to the next valid instant.
    assert.ok(berlinLocalToUtc("2026-03-29T02:30"));
    // 25.10.2026 has 01:00 twice in UTC terms; 03:00 local is unambiguous.
    assert.equal(berlinLocalToUtc("2026-10-25T03:00")?.toISOString(), "2026-10-25T02:00:00.000Z");
  });

  test("invalid calendar dates and formats are rejected", () => {
    assert.equal(berlinLocalToUtc("2026-02-30T10:00"), null);
    assert.equal(berlinLocalToUtc("2026-12-05T24:00"), null);
    assert.equal(berlinLocalToUtc("05.12.2026 14:00"), null);
    assert.equal(berlinLocalToUtc("2026-12-05T13:00:00.000Z"), null);
  });

  test("UTC instant round-trips to the datetime-local value shown in Berlin", () => {
    assert.equal(utcToBerlinLocalInput(new Date("2026-12-05T13:00:00Z")), "2026-12-05T14:00");
    assert.equal(utcToBerlinLocalInput("2026-07-05T12:00:00Z"), "2026-07-05T14:00");
    assert.equal(utcToBerlinLocalInput(null), "");
    const local = "2026-11-25T00:30";
    assert.equal(utcToBerlinLocalInput(berlinLocalToUtc(local)), local);
  });
});

describe("events: schemas", () => {
  const base = { title: "Sommerfest", startDate: "2026-12-05T14:00" };

  test("create applies defaults", () => {
    const parsed = eventCreateSchema.parse(base);
    assert.equal(parsed.type, "OTHER");
    assert.equal(parsed.status, "PUBLISHED");
    assert.equal(parsed.isOnline, false);
  });

  test("partial update does not inject defaults for omitted fields", () => {
    const parsed = eventUpdateSchema.parse({ id: "4f0a6f7e-8b8c-4c1b-9d6c-2b1e9f7a1c11", title: "Neu" });
    assert.equal(parsed.title, "Neu");
    assert.equal("type" in parsed && parsed.type !== undefined, false);
    assert.equal("status" in parsed && parsed.status !== undefined, false);
    assert.equal("isOnline" in parsed && parsed.isOnline !== undefined, false);
  });

  test("end before start is rejected on create and on update", () => {
    const create = eventCreateSchema.safeParse({ ...base, endDate: "2026-12-05T10:00" });
    assert.equal(create.success, false);
    assert.equal(create.error?.issues[0]?.message, "events.validation.endBeforeStart");
    const update = eventUpdateSchema.safeParse({ id: "4f0a6f7e-8b8c-4c1b-9d6c-2b1e9f7a1c11", startDate: "2026-12-05T14:00", endDate: "2026-12-04T14:00" });
    assert.equal(update.success, false);
    assert.equal(isEndBeforeStart("2026-12-05T14:00", "2026-12-05T14:00"), false);
    assert.equal(isEndBeforeStart("2026-12-05T14:00", ""), false);
  });

  test("invalid dates and over-long fields are rejected", () => {
    assert.equal(eventCreateSchema.safeParse({ ...base, startDate: "2026-02-30T10:00" }).success, false);
    assert.equal(eventCreateSchema.safeParse({ ...base, title: "x".repeat(201) }).success, false);
    assert.equal(eventCreateSchema.safeParse({ ...base, capacity: 0 }).success, false);
    assert.equal(
      attendeeAddSchema.safeParse({ eventId: "4f0a6f7e-8b8c-4c1b-9d6c-2b1e9f7a1c11", firstName: "A".repeat(101), lastName: "Muster" }).success,
      false,
    );
  });
});
