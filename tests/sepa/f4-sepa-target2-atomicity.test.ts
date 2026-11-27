import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  buildPain008,
  earliestCollectionDate,
  easterSundayUtc,
  isTarget2BankingDay,
  isTarget2Holiday,
  isValidCollectionDate,
  sepaRef,
} from "@/modules/sepa/lib/pain008";

describe("SEPA TARGET2 calendar, pain.008 hardening & run atomicity (#578)", () => {
  test("TARGET2 holidays: New Year, Good Friday, Easter Monday, May 1, Christmas", () => {
    // Easter 2026 is 2026-04-05 -> Good Friday 2026-04-03, Easter Monday 2026-04-06
    assert.equal(easterSundayUtc(2026).toISOString().slice(0, 10), "2026-04-05");
    assert.equal(isTarget2Holiday("2026-01-01"), true);
    assert.equal(isTarget2Holiday("2026-04-03"), true);
    assert.equal(isTarget2Holiday("2026-04-06"), true);
    assert.equal(isTarget2Holiday("2026-05-01"), true);
    assert.equal(isTarget2Holiday("2026-12-25"), true);
    assert.equal(isTarget2Holiday("2026-12-26"), true);
    assert.equal(isTarget2Holiday("2026-04-07"), false);

    // Weekend + holidays are NOT banking days
    assert.equal(isTarget2BankingDay("2026-04-03"), false); // Good Friday
    assert.equal(isTarget2BankingDay("2026-04-04"), false); // Saturday
    assert.equal(isTarget2BankingDay("2026-04-05"), false); // Sunday
    assert.equal(isTarget2BankingDay("2026-04-06"), false); // Easter Monday
    assert.equal(isTarget2BankingDay("2026-04-07"), true); // Tuesday
  });

  test("earliestCollectionDate and isValidCollectionDate skip weekends and TARGET2 holidays in Europe/Berlin", () => {
    // Thursday 2026-04-02 -> D+1 TARGET2 banking day is Tuesday 2026-04-07
    assert.equal(earliestCollectionDate(new Date("2026-04-02T12:00:00Z"), 1), "2026-04-07");
    assert.equal(earliestCollectionDate(new Date("2026-04-02T12:00:00Z"), 2), "2026-04-08");

    const thuBerlin = new Date("2026-04-02T10:00:00Z"); // 12:00 CEST
    assert.equal(isValidCollectionDate("2026-04-02", thuBerlin), false); // today
    assert.equal(isValidCollectionDate("2026-04-03", thuBerlin), false); // Good Friday
    assert.equal(isValidCollectionDate("2026-04-04", thuBerlin), false); // Saturday
    assert.equal(isValidCollectionDate("2026-04-06", thuBerlin), false); // Easter Monday
    assert.equal(isValidCollectionDate("2026-04-07", thuBerlin), true); // D+1 TARGET2 banking day

    // Late-night UTC (23:30 UTC on 2026-04-06 = 01:30 CEST on 2026-04-07 in Europe/Berlin):
    // 2026-04-07 is ALREADY "today" in Berlin so it must be rejected; 2026-04-08 is D+1.
    const lateNightUtc = new Date("2026-04-06T23:30:00Z");
    assert.equal(isValidCollectionDate("2026-04-07", lateNightUtc), false);
    assert.equal(isValidCollectionDate("2026-04-08", lateNightUtc), true);
  });

  test("sepaRef strips leading/trailing slashes and collapses // (RestrictedIdentificationSEPA1)", () => {
    assert.equal(sepaRef("/M-2026//001/"), "M-2026/001");
    assert.equal(sepaRef("///"), "NOTPROVIDED");
    assert.equal(sepaRef("  M-01 // 02  "), "M-01/02");
  });

  test("buildPain008 rejects empty sanitized debtor/creditor names instead of emitting empty <Nm>", () => {
    assert.throws(() =>
      buildPain008({
        messageId: "LS-2026-0001",
        createdAt: new Date("2026-11-07T10:00:00Z"),
        collectionDate: "2026-11-12",
        creditor: { name: "Test Verein e.V.", iban: "DE89370400440532013000", bic: null, creditorId: "DE98ZZZ09999999999" },
        transactions: [
          {
            endToEndId: "LS-2026-0001-1",
            amountCents: 6000,
            mandateId: "M-1",
            mandateDate: "2026-01-15",
            debtorName: "—",
            debtorIban: "DE02120300000000202051",
            debtorBic: null,
            remittance: "Beitrag",
          },
        ],
      }),
    );
  });

  test("SEPA runs service blocks futureSignatureDate, uses atomic transactions, and checks runId on return", () => {
    const runs = readFileSync("src/modules/sepa/services/runs.ts", "utf8");
    assert.match(runs, /"futureSignatureDate"/);
    assert.match(runs, /missingDebtorName/);
    assert.doesNotMatch(runs, /debtorName:\s*guardian\?\.accountHolder\s*\?\?\s*"—"/);
    assert.match(runs, /status:\s*"CREATED"[\s\S]*status:\s*"COLLECTED"/);
    assert.match(runs, /item\.runId !== runId/);
    assert.match(runs, /error\.code === "P2002"/);
  });
});
