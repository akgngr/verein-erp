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

// #638 review: mixed-sign tax groups keep their relative signs (only the document's overall sign is normalised).
test("mixed-sign groups keep their breakdown: a negative group is not turned into an expense", () => {
  const groups = [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 0, netCents: -5000, taxCents: 0 }];
  const full = planPayablePayment(groups, { grossCents: 6900, paidCents: 0 }, null);
  assert.ok(full);
  assert.equal(full.amountCents, 6900);
  // The cash-increasing offset comes first: each part is its own booking and cash accounts are checked per booking.
  assert.deepEqual(full.parts, [{ rate: 0, netCents: -5000, taxCents: 0 }, { rate: 19, netCents: 10000, taxCents: 1900 }]);
  assert.equal(full.parts.reduce((sum, part) => sum + part.taxCents, 0), 1900, "the full €19 input tax, not €7.76");

  const half = planPayablePayment(groups, { grossCents: 6900, paidCents: 0 }, 3450);
  assert.ok(half);
  assert.equal(half.parts.reduce((sum, part) => sum + part.netCents + part.taxCents, 0), 3450);
  assert.equal(half.parts.find((part) => part.rate === 19)!.taxCents, 950);
  assert.ok(half.parts.find((part) => part.rate === 0)!.netCents < 0);

  // The same document as a credit note: everything flips, relative signs stay.
  const credit = planPayablePayment(groups.map((g) => ({ rate: g.rate, netCents: -g.netCents, taxCents: -g.taxCents })), { grossCents: -6900, paidCents: 0 }, null);
  assert.ok(credit);
  assert.equal(credit.amountCents, -6900);
  assert.deepEqual(credit.parts, [{ rate: 19, netCents: -10000, taxCents: -1900 }, { rate: 0, netCents: 5000, taxCents: 0 }]);
});

test("single-sign documents keep their booking order; mixed signs put cash-increasing parts first", () => {
  const multi = planPayablePayment(
    [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 10000, taxCents: 700 }],
    { grossCents: 22600, paidCents: 0 },
    null,
  );
  assert.deepEqual(multi?.parts.map((part) => part.rate), [19, 7]);
  // Running cash balance never dips below the final result when the parts are booked in order (cash 69 € pays 69 €).
  const mixed = planPayablePayment(
    [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 0, netCents: -5000, taxCents: 0 }],
    { grossCents: 6900, paidCents: 0 },
    null,
  );
  assert.ok(mixed);
  let cash = 6900;
  for (const part of mixed.parts) {
    cash -= part.netCents + part.taxCents;
    assert.ok(cash >= 0, `cash stays non-negative after each booking (was ${cash})`);
  }
  assert.equal(cash, 0);
});
