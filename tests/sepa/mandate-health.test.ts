import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import { addMonths, checkMandate, coachAdvice, isBlocked, recentReturns, RETURN_CODE_LIST, RETURN_CODES, returnSummary, type HealthContext } from "@/modules/sepa/lib/mandate-health";

// B001 Q2 (#406) — synthetic data only.
const VALID_IBAN = "DE89 3704 0044 0532 0130 00";
const today = new Date("2026-11-23T00:00:00Z");
const ok = { iban: VALID_IBAN, holder: "Test Holder", mandateReference: "M-0001", mandateDate: "2025-01-15" };
const ctx = (over: Partial<HealthContext> = {}): HealthContext => ({ today, lastCollectedAt: null, returns: [], maxReturns: 2, ...over });

describe("SEPA mandate health (#406)", () => {
  test("a complete, recent mandate has no issues", () => {
    assert.deepEqual(checkMandate(ok, ctx()), []);
  });

  test("missing reference, signature date and IBAN are blocking; IBAN checksum is local", () => {
    assert.deepEqual(checkMandate({ iban: null, holder: null, mandateReference: " ", mandateDate: null }, ctx()), ["missingIban", "missingReference", "missingSignatureDate", "missingHolder"]);
    const invalid = checkMandate({ ...ok, iban: "DE89370400440532013001" }, ctx());
    assert.deepEqual(invalid, ["invalidIban"]);
    assert.equal(isBlocked(invalid), true);
    assert.equal(isBlocked(["missingHolder"]), false, "an empty holder is only a warning");
  });

  test("a signature date in the future is inconsistent", () => {
    assert.deepEqual(checkMandate({ ...ok, mandateDate: "2027-01-01" }, ctx()), ["futureSignatureDate"]);
  });

  test("36-month dormancy counts from the last collection, else from the signature date", () => {
    const old = { ...ok, mandateDate: "2023-11-23" };
    assert.deepEqual(checkMandate(old, ctx()), ["dormant"], "exactly 36 months without use expires");
    assert.deepEqual(checkMandate({ ...ok, mandateDate: "2023-11-24" }, ctx()), [], "one day short of 36 months is still valid");
    assert.deepEqual(checkMandate(old, ctx({ lastCollectedAt: new Date("2025-06-01T00:00:00Z") })), [], "a collection resets the clock");
    assert.deepEqual(checkMandate(old, ctx({ lastCollectedAt: new Date("2023-06-01T00:00:00Z") })), ["dormant"], "a use before the signature does not count");
  });

  test("a return that needs a new mandate blocks until a newer mandate is signed", () => {
    const returns = [{ code: "AC04", at: new Date("2026-09-01T00:00:00Z"), feeCents: 300 }];
    assert.deepEqual(checkMandate(ok, ctx({ returns, maxReturns: 5 })), ["renewAfterReturn"]);
    assert.deepEqual(checkMandate({ ...ok, mandateDate: "2026-10-01" }, ctx({ returns, maxReturns: 5 })), [], "a newer mandate resolves it");
    assert.deepEqual(checkMandate(ok, ctx({ returns: [{ code: "AM04", at: new Date("2026-09-01T00:00:00Z"), feeCents: 300 }], maxReturns: 5 })), [], "insufficient funds allows a retry");
  });

  test("collection pauses after N returns within 12 months (configurable)", () => {
    const returns = [
      { code: "AM04", at: new Date("2026-10-01T00:00:00Z"), feeCents: 300 },
      { code: "AM04", at: new Date("2026-05-01T00:00:00Z"), feeCents: 450 },
      { code: "AM04", at: new Date("2025-06-01T00:00:00Z"), feeCents: 300 },
    ];
    assert.deepEqual(checkMandate(ok, ctx({ returns, maxReturns: 2 })), ["pausedAfterReturns"]);
    assert.deepEqual(checkMandate(ok, ctx({ returns, maxReturns: 3 })), [], "the return from 2025 is outside the window");
    assert.equal(recentReturns(returns, today).length, 2);
    assert.deepEqual(returnSummary(returns, today), { count: 2, feeCents: 750, latestCode: "AM04" });
  });

  test("coach advice by return code", () => {
    assert.equal(coachAdvice("AM04").action, "retry");
    assert.equal(coachAdvice("MD01").action, "renewMandate");
    assert.equal(coachAdvice("MS02").action, "contactDebtor");
    assert.equal(coachAdvice("XX99").action, "manualCheck");
    assert.equal(coachAdvice(null).action, "manualCheck");
  });

  test("month arithmetic clamps to the month end", () => {
    assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(addMonths(new Date("2026-11-23T00:00:00Z"), -36).toISOString().slice(0, 10), "2023-11-23");
  });
});

describe("SEPA coach texts and privacy (#406)", () => {
  test("every return code, issue and next action has TR and DE text", () => {
    for (const lang of ["tr", "de"]) {
      const m = JSON.parse(fs.readFileSync(`src/modules/sepa/messages/${lang}.json`, "utf8"));
      for (const code of RETURN_CODE_LIST) assert.ok(m.coach.codes[code], `${lang} coach.codes.${code}`);
      for (const action of ["retry", "renewMandate", "contactDebtor", "manualCheck"]) assert.ok(m.coach.actions[action], `${lang} coach.actions.${action}`);
      for (const issue of ["missingIban", "invalidIban", "missingReference", "missingSignatureDate", "futureSignatureDate", "dormant", "missingHolder", "renewAfterReturn", "pausedAfterReturns"]) assert.ok(m.health.issues[issue], `${lang} health.issues.${issue}`);
      for (const skip of ["dormant", "renewAfterReturn", "pausedAfterReturns"]) assert.ok(m.skip[skip], `${lang} skip.${skip}`);
    }
    assert.equal(Object.keys(RETURN_CODES).length, RETURN_CODE_LIST.length);
  });

  test("the health scan only returns masked IBANs and never writes or sends", () => {
    const health = fs.readFileSync("src/modules/sepa/services/health.ts", "utf8");
    assert.match(health, /ibanMasked: item\.iban && isValidIban\(item\.iban\) \? mask\(/);
    assert.doesNotMatch(health, /iban: item\.iban|\.create\(|\.update\(|\.delete|sendBulkMail|fetch\(/);
    const history = fs.readFileSync("src/modules/sepa/services/history.ts", "utf8");
    assert.doesNotMatch(history, /\.create\(|\.update\(|\.delete/);
    const actions = fs.readFileSync("src/modules/sepa/actions/sepa-actions.ts", "utf8");
    assert.match(actions, /after: \{ returned: true, code: input\.code, feeCents: input\.feeCents \}/, "the audit log stores code and fee, not the free-text note");
  });

  test("the run preview skips future-dated, dormant, renew-after-return and paused mandates", () => {
    const runs = fs.readFileSync("src/modules/sepa/services/runs.ts", "utf8");
    assert.match(runs, /HEALTH_SKIPS: readonly HealthIssue\[\] = \["futureSignatureDate", "dormant", "renewAfterReturn", "pausedAfterReturns"\]/);
    assert.match(runs, /const skipHealth = healthSkip\(item\)|else if \(healthSkip\(item\)\)/);
  });
});
