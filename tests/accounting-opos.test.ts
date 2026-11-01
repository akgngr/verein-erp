import assert from "node:assert/strict";
import { test } from "node:test";

import { aging, allocatePayment, nextContactNumber, openCents } from "../src/modules/accounting/services/invoice-payments";

test("kısmi ödeme oranlara orantılı dağılır, toplam korunur", () => {
  const groups = [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 5000, taxCents: 350 }];
  const parts = allocatePayment(groups, 8000);
  assert.equal(parts.reduce((sum, part) => sum + part.netCents + part.taxCents, 0), 8000);
  assert.deepEqual(parts.map((part) => part.rate), [19, 7]);
  // 11900/17250 ≈ %69 → 5519
  assert.equal(parts[0].netCents + parts[0].taxCents, 5519);
  assert.deepEqual(allocatePayment(groups, 17250).map((p) => p.taxCents), [1900, 350]);
});

test("oran yoksa tamamı %0", () => {
  assert.deepEqual(allocatePayment([], 500), [{ rate: 0, netCents: 500, taxCents: 0 }]);
});

test("açık tutar ve yaşlandırma", () => {
  assert.equal(openCents({ grossCents: 1000, paidCents: 600, skontoCents: 30 }), 370);
  assert.equal(openCents({ grossCents: 1000, paidCents: 1000, skontoCents: 30 }), 0);
  const today = new Date("2026-11-01T00:00:00Z");
  assert.deepEqual(aging(new Date("2026-11-05T00:00:00Z"), today), { daysOverdue: 0, bucket: "notDue" });
  assert.equal(aging(new Date("2026-10-01T00:00:00Z"), today).bucket, "d31_60");
  assert.equal(aging(new Date("2026-06-01T00:00:00Z"), today).bucket, "d90plus");
});

test("cari numaraları DATEV aralıklarında", () => {
  assert.equal(nextContactNumber("CUSTOMER", null), 10000);
  assert.equal(nextContactNumber("CUSTOMER", 10041), 10042);
  assert.equal(nextContactNumber("SUPPLIER", null), 70000);
  assert.throws(() => nextContactNumber("CUSTOMER", 69999));
});
