import assert from "node:assert/strict";
import test from "node:test";

import { planPayablePayment } from "@/modules/accounting/services/payable-payment-plan";

// #597 review: tedarikçi alacak dekontu (negatif tutarlar) iade olarak kapatılabilir; normal ödeme değişmez.
test("regular payable payment allocates a positive amount across rates", () => {
  const plan = planPayablePayment([{ rate: 19, netCents: 10000, taxCents: 1900 }], { grossCents: 11900, paidCents: 0 }, null);
  assert.ok(plan);
  assert.equal(plan.amountCents, 11900);
  assert.equal(plan.settled, true);
  assert.deepEqual(plan.parts, [{ rate: 19, netCents: 10000, taxCents: 1900 }]);
});

test("credit note settlement books a negative refund and keeps the signed open amount", () => {
  const groups = [{ rate: 19, netCents: -10000, taxCents: -1900 }];
  const full = planPayablePayment(groups, { grossCents: -11900, paidCents: 0 }, null);
  assert.ok(full);
  assert.equal(full.amountCents, -11900);
  assert.equal(full.settled, true);
  assert.deepEqual(full.parts, [{ rate: 19, netCents: -10000, taxCents: -1900 }]);

  // Kısmi iade: kullanıcı/banka tutarı pozitif girer.
  const partial = planPayablePayment(groups, { grossCents: -11900, paidCents: 0 }, 5950);
  assert.ok(partial);
  assert.equal(partial.amountCents, -5950);
  assert.equal(partial.settled, false);
  assert.equal(partial.parts[0]!.netCents + partial.parts[0]!.taxCents, -5950);
});

test("invalid amounts are rejected for both directions", () => {
  assert.equal(planPayablePayment([], { grossCents: 11900, paidCents: 11900 }, null), null);
  assert.equal(planPayablePayment([{ rate: 0, netCents: 500, taxCents: 0 }], { grossCents: 500, paidCents: 0 }, 600), null);
  assert.equal(planPayablePayment([{ rate: 0, netCents: -500, taxCents: 0 }], { grossCents: -500, paidCents: 0 }, 0), null);
});
