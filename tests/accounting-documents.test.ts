import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { calculateInvoiceTotals } from "../src/modules/accounting/services/invoice-calc";

describe("Fatura hesapları", () => {
  test("satır neti yuvarlanır, KDV oran başına bir kez hesaplanır", () => {
    const totals = calculateInvoiceTotals([
      { quantity: 4, unitPriceCents: 2500, taxRate: 19 },
      { quantity: 1.5, unitPriceCents: 1999, taxRate: 7 },
      { quantity: 1, unitPriceCents: 1000, taxRate: 0 },
    ]);
    assert.deepEqual(totals.lineTotals, [10000, 2999, 1000]);
    assert.equal(totals.netCents, 13999);
    assert.equal(totals.taxCents, 1900 + 210);
    assert.equal(totals.grossCents, 16109);
    assert.deepEqual(totals.byRate.map((row) => row.rate), [0, 7, 19]);
  });

  test("vergisiz faturada toplam = net", () => {
    const totals = calculateInvoiceTotals([{ quantity: 2, unitPriceCents: 1250, taxRate: 0 }]);
    assert.equal(totals.taxCents, 0);
    assert.equal(totals.grossCents, 2500);
  });
});
