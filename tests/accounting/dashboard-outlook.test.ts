import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bucketOpenDocuments,
  forecastLiquidity,
  openCentsOf,
  percentChange,
  topSlices,
} from "@/modules/accounting/services/dashboard-outlook";

const today = new Date(Date.UTC(2026, 10, 17));
const day = (offset: number) => new Date(today.getTime() + offset * 86_400_000);

test("ACC-10 open amount subtracts payments and Skonto, never negative", () => {
  assert.equal(openCentsOf({ dueDate: null, grossCents: 10_000, paidCents: 2_500, skontoCents: 500 }), 7_000);
  assert.equal(openCentsOf({ dueDate: null, grossCents: 10_000, paidCents: 12_000 }), 0);
});

test("ACC-10 outlook buckets: overdue, within horizon (inclusive), beyond horizon ignored", () => {
  const result = bucketOpenDocuments([
    { dueDate: day(-1), grossCents: 1_000, paidCents: 0 },
    { dueDate: day(0), grossCents: 2_000, paidCents: 500 },
    { dueDate: day(30), grossCents: 3_000, paidCents: 0 },
    { dueDate: day(31), grossCents: 9_000, paidCents: 0 },
    { dueDate: null, grossCents: 9_000, paidCents: 0 },
    { dueDate: day(5), grossCents: 1_000, paidCents: 1_000 },
  ], today, 30);
  assert.deepEqual(result, { overdue: { count: 1, cents: 1_000 }, upcoming: { count: 2, cents: 4_500 } });
});

test("ACC-10 forecast = balance + receivables − payables", () => {
  assert.equal(forecastLiquidity({ balanceCents: 50_000, receivablesCents: 12_000, payablesCents: 70_000 }), -8_000);
});

test("ACC-10 percent change: null on zero base, sign follows direction", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(-50, -100), 50);
  assert.equal(percentChange(10, 0), null);
});

test("ACC-10 top slices keep the largest positive rows and sum the rest", () => {
  const rows = [{ cents: 5 }, { cents: 50 }, { cents: 0 }, { cents: 20 }, { cents: 10 }];
  assert.deepEqual(topSlices(rows, 2), { top: [{ cents: 50 }, { cents: 20 }], otherCents: 15 });
});
