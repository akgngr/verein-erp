import assert from "node:assert/strict";
import { test } from "node:test";

import { calculatePayout, exceedsLimit, isValidPeriod, periodRange, sessionMinutes } from "../src/modules/courses/services/payout-calc";

const s = (id: string, date: string, startTime: string | null, endTime: string | null) => ({ id, date, startTime, endTime, courseCode: "K-1", courseTitle: "Mathe" });

test("ders süresi saatlerden; eksik/hatalıysa varsayılan", () => {
  assert.equal(sessionMinutes({ startTime: "16:00", endTime: "17:30" }, 60), 90);
  assert.equal(sessionMinutes({ startTime: null, endTime: null }, 45), 45);
  assert.equal(sessionMinutes({ startTime: "17:00", endTime: "16:00" }, 60), 60);
});

test("saat ücreti: dakika × ücret / 60, sıralı satırlar", () => {
  const result = calculatePayout([s("b", "2026-10-08", "16:00", "17:30"), s("a", "2026-10-01", null, null)], { rateCents: 2000, rateUnit: "HOUR" }, 45);
  assert.deepEqual(result.lines.map((line) => [line.sessionId, line.minutes, line.amountCents]), [["a", 45, 1500], ["b", 90, 3000]]);
  assert.equal(result.amountCents, 4500);
  assert.equal(result.minutes, 135);
});

test("ders başı ücret süreden bağımsız", () => {
  const result = calculatePayout([s("a", "2026-10-01", "16:00", "18:00"), s("b", "2026-10-02", null, null)], { rateCents: 3500, rateUnit: "SESSION" }, 60);
  assert.equal(result.amountCents, 7000);
});

test("dönem ve yıllık sınır", () => {
  assert.ok(isValidPeriod("2026-10"));
  assert.ok(!isValidPeriod("2026-13"));
  const { from, to } = periodRange("2026-12");
  assert.equal(from.toISOString().slice(0, 10), "2026-12-01");
  assert.equal(to.toISOString().slice(0, 10), "2027-01-01");
  const limits = { uebungsleiterLimitCents: 330000, ehrenamtLimitCents: 96000 };
  assert.ok(exceedsLimit("EHRENAMT", 96001, limits));
  assert.ok(!exceedsLimit("UEBUNGSLEITER", 330000, limits));
  assert.ok(!exceedsLimit("HONORAR", 99999999, limits));
});
