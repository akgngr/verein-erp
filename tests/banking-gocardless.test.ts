import assert from "node:assert/strict";
import { test } from "node:test";

import { mapGoCardlessTransaction } from "../src/modules/banking/services/providers/gocardless";

test("gelen ödeme: karşı taraf borçlu (debtor)", () => {
  const row = mapGoCardlessTransaction({
    transactionId: "t1",
    endToEndId: "E2E-1",
    bookingDate: "2026-10-30",
    valueDate: "2026-10-31",
    transactionAmount: { amount: "45.50", currency: "EUR" },
    debtorName: "Anna Muster",
    debtorAccount: { iban: "DE89370400440532013000" },
    remittanceInformationUnstructuredArray: ["Beitrag", "Oktober"],
  });
  assert.deepEqual(row, {
    bookingDate: "2026-10-30",
    valueDate: "2026-10-31",
    amountCents: 4550,
    currency: "EUR",
    counterpartyName: "Anna Muster",
    counterpartyIban: "DE89370400440532013000",
    purpose: "Beitrag Oktober",
    reference: "E2E-1",
  });
});

test("giden ödeme: karşı taraf alacaklı; NOTPROVIDED referansı yerine işlem kimliği", () => {
  const row = mapGoCardlessTransaction({
    transactionId: "t2",
    endToEndId: "NOTPROVIDED",
    bookingDate: "2026-10-29",
    transactionAmount: { amount: "-120.00", currency: "EUR" },
    creditorName: "Stadtwerke",
    remittanceInformationUnstructured: "Rechnung  4711",
  });
  assert.equal(row.amountCents, -12000);
  assert.equal(row.counterpartyName, "Stadtwerke");
  assert.equal(row.reference, "t2");
  assert.equal(row.purpose, "Rechnung 4711");
  assert.equal(row.valueDate, null);
});
