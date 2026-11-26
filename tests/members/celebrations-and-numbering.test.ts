import assert from "node:assert/strict";
import test from "node:test";

import { upcomingCelebrations, type CelebrationMember } from "@/modules/members/lib/celebrations";
import { membershipNumberYear } from "@/modules/members/services/membership-number";

// #605: Doğum günü/yıldönümü listesi ve üyelik numarası yılı (sentetik veri).
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const member = (id: string, birth: string | null, join: string): CelebrationMember => ({
  id, firstName: `Ad${id}`, lastName: `Soyad${id}`, membershipNumber: `UYE-2000-${id}`, birthDate: birth ? d(birth) : null, joinDate: d(join),
});

test("birthdays within the window are listed with the age turned, sorted by date", () => {
  const today = d("2026-11-26");
  const list = upcomingCelebrations([member("1", "1990-12-10", "2024-01-01"), member("2", "1985-11-26", "2024-01-01"), member("3", "1970-01-30", "2024-01-01")], today);
  assert.deepEqual(list.map((c) => [c.memberId, c.kind, c.years, c.daysUntil]), [["2", "birthday", 41, 0], ["1", "birthday", 36, 14]]);
});

test("window wraps into the next year and 29 February falls on 28 February", () => {
  const list = upcomingCelebrations([member("4", "2000-01-05", "2024-01-01"), member("5", "2004-02-29", "2024-01-01")], d("2026-12-20"), 70);
  assert.deepEqual(list.map((c) => [c.memberId, c.date.toISOString().slice(0, 10), c.years]), [["4", "2027-01-05", 27], ["5", "2027-02-28", 23]]);
});

test("only round membership anniversaries are listed; members without birth dates are skipped", () => {
  const today = d("2026-11-26");
  const list = upcomingCelebrations([member("6", null, "2001-12-01"), member("7", null, "2016-12-05"), member("8", null, "2003-12-01")], today);
  assert.deepEqual(list.map((c) => [c.memberId, c.kind, c.years]), [["6", "anniversary", 25], ["7", "anniversary", 10]]);
});

test("membership number year follows the join date, not the registration moment", () => {
  assert.equal(membershipNumberYear(d("1998-03-01")), 1998);
  assert.equal(membershipNumberYear(d("2026-12-31")), 2026);
});
