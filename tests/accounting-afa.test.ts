import assert from "node:assert/strict";
import { test } from "node:test";

import { depreciationForYear, depreciationSchedule, flatRateAmountCents, flatRateYearTotals, suggestMethod } from "../src/modules/accounting/services/afa";
import { freeReserveLimitCents, nextBusinessDay, taxDeadlines } from "../src/modules/accounting/services/tax-calendar";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

test("AfA doğrusal: aylık pro rata, toplam = maliyet", () => {
  // 3.600 € dizüstü, 36 ay, Ekim alımı → 2026: 3 ay (300), 2027: 1.200, 2028: 1.200, 2029: 9 ay (900)
  const schedule = depreciationSchedule({ costCents: 360_000, acquisitionDate: d("2026-10-15"), usefulLifeMonths: 36, method: "LINEAR", disposalDate: null });
  assert.deepEqual(schedule.map((row) => [row.year, row.amountCents]), [[2026, 30_000], [2027, 120_000], [2028, 120_000], [2029, 90_000]]);
  assert.equal(schedule.at(-1)?.bookValueCents, 0);
  // Yuvarlamalı tutar: toplam yine tam maliyet.
  const odd = depreciationSchedule({ costCents: 100_001, acquisitionDate: d("2026-03-01"), usefulLifeMonths: 37, method: "LINEAR", disposalDate: null });
  assert.equal(odd.reduce((sum, row) => sum + row.amountCents, 0), 100_001);
});

test("GWG, Sammelposten, satış yılı", () => {
  assert.equal(suggestMethod(80_000), "GWG");
  assert.equal(suggestMethod(80_001), "LINEAR");
  assert.deepEqual(depreciationSchedule({ costCents: 70_000, acquisitionDate: d("2026-12-30"), usefulLifeMonths: 36, method: "GWG", disposalDate: null }), [{ year: 2026, amountCents: 70_000, bookValueCents: 0 }]);
  const pool = depreciationSchedule({ costCents: 90_001, acquisitionDate: d("2026-12-30"), usefulLifeMonths: 0, method: "POOL", disposalDate: null });
  assert.deepEqual(pool.map((row) => row.amountCents), [18_000, 18_000, 18_000, 18_000, 18_001]);
  const asset = { costCents: 360_000, acquisitionDate: d("2026-10-15"), usefulLifeMonths: 36, method: "LINEAR" as const, disposalDate: d("2027-06-30") };
  assert.deepEqual(depreciationForYear(asset, 2027), { amountCents: 330_000, bookValueEndCents: 0 });
  assert.equal(depreciationForYear(asset, 2028).amountCents, 0);
});

test("götürüler ve tavan", () => {
  assert.equal(flatRateAmountCents("HOME_OFFICE", 10), 6000);
  assert.equal(flatRateAmountCents("MILEAGE", 123), 3690);
  const totals = flatRateYearTotals([{ kind: "HOME_OFFICE", amountCents: 150_000 }, { kind: "MILEAGE", amountCents: 3690 }]);
  assert.equal(totals.HOME_OFFICE.cappedCents, 126_000);
  assert.equal(totals.MILEAGE.cappedCents, 3690);
});

test("vergi takvimi", () => {
  assert.equal(nextBusinessDay(d("2026-10-10")).toISOString().slice(0, 10), "2026-10-12"); // Cumartesi → Pazartesi
  const quarter = taxDeadlines(2026, { vatPeriod: "QUARTER", extension: false, smallBusiness: false }).filter((item) => item.key === "ustva");
  assert.deepEqual(quarter.map((item) => item.due.toISOString().slice(0, 10)), ["2026-04-10", "2026-07-10", "2026-10-12", "2027-01-11"]);
  const extended = taxDeadlines(2026, { vatPeriod: "MONTH", extension: true, smallBusiness: false }).filter((item) => item.key === "ustva");
  assert.equal(extended[0].due.toISOString().slice(0, 10), "2026-03-10");
  assert.equal(taxDeadlines(2026, { vatPeriod: "QUARTER", extension: false, smallBusiness: true }).some((item) => item.key === "ustva"), false);
  assert.equal(freeReserveLimitCents({ assetManagementSurplusCents: 300_000, otherFundsCents: 1_000_000 }), 200_000);
});
