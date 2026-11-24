/** ADR 0009 / #414: rule data validity, generic engine on synthetic data (threshold ±1), fail closed, wording. */
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { describe } from "node:test";

import { COMPLIANCE_RULES } from "@/modules/compliance/rules";
import { complianceRuleSchema, type ComplianceRule } from "@/modules/compliance/rules/schema";
import { evaluateRule, isEffective, trafficLight } from "@/modules/compliance/services/engine";
import { pseudonymousRef, type MetricValue } from "@/shared/compliance/define";

const rule = (id: string): ComplianceRule => COMPLIANCE_RULES.find((candidate) => candidate.id === id)!;
const ctx = { year: 2026, today: "2026-06-01" };
const num = (value: number, unit: "cents" | "count" = "cents"): MetricValue => ({ kind: "number", value, unit });

describe("rule data (ADR 0009)", () => {
  test("first five v1 rules exist, validate, and stay draft until reviewed", () => {
    assert.deepEqual(COMPLIANCE_RULES.map((r) => r.id).sort(), [
      "gem.economic-operation-threshold", "gem.exemption-notice-expiry", "gem.receipt-template-validity", "gem.timely-use-of-funds", "gem.uebungsleiter-allowance",
    ]);
    for (const r of COMPLIANCE_RULES) {
      assert.ok(r.legalSource.length > 0, r.id);
      assert.equal(r.review.status, "draft", `${r.id}: content review (owner/tax advisor) is pending`);
      assert.ok(isEffective(r, 2026));
      assert.doesNotMatch(r.finding.tr + r.finding.de, /\b(you will|Sie werden|kaybedeceksiniz|müssen Sie)\b/i, "facts only, no individual conclusion");
    }
  });

  test("schema rejects thresholds in the wrong place, reviewed-without-reviewer and bad dates", () => {
    const base = JSON.parse(JSON.stringify(rule("gem.economic-operation-threshold")));
    assert.equal(complianceRuleSchema.safeParse({ ...base, review: { status: "reviewed", reviewerRole: "owner" } }).success, false);
    assert.equal(complianceRuleSchema.safeParse({ ...base, effective: { from: "2026-01-01", to: "2025-12-31" } }).success, false);
    assert.equal(complianceRuleSchema.safeParse({ ...base, condition: { op: "gt" } }).success, false);
    assert.equal(complianceRuleSchema.safeParse({ ...base, extra: 1 }).success, false);
    assert.equal(complianceRuleSchema.safeParse({ ...base, review: { status: "reviewed", reviewerRole: "owner", reviewedAt: "2026-11-23", reviewedBy: "owner" } }).success, true);
  });
});

describe("engine on synthetic data", () => {
  test("economic-operation threshold: ±1 cent around the param", () => {
    const r = rule("gem.economic-operation-threshold");
    const limit = r.params.thresholdCents as number;
    assert.equal(evaluateRule(r, num(limit), ctx)[0].status, "ok");
    assert.equal(evaluateRule(r, num(limit - 1), ctx)[0].status, "ok");
    const hit = evaluateRule(r, num(limit + 1), ctx)[0];
    assert.equal(hit.status, "triggered");
    assert.equal(hit.severity, "critical");
    assert.match(hit.message!.de, /§ 64 Abs\. 3 AO/);
  });

  test("Übungsleiter per person: only people above the limit, pseudonymous ref, no names", () => {
    const r = rule("gem.uebungsleiter-allowance");
    const limit = r.params.limitCents as number;
    const metric: MetricValue = { kind: "perPerson", unit: "cents", rows: [{ ref: pseudonymousRef("L", "t1"), value: limit }, { ref: pseudonymousRef("L", "t2"), value: limit + 1 }] };
    const findings = evaluateRule(r, metric, ctx);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].facts.ref, pseudonymousRef("L", "t2"));
    assert.match(String(findings[0].facts.ref), /^L-[0-9A-Z]{6}$/);
    assert.equal(evaluateRule(r, { kind: "perPerson", unit: "cents", rows: [] }, ctx)[0].status, "ok");
  });

  test("exemption notice: variant-specific validity, warn window ±1 day", () => {
    const r = rule("gem.exemption-notice-expiry");
    const warnDays = r.params.warnDays as number;
    // notice 2021-12-01 + 5y = 2026-12-01 → 183 days after 2026-06-01
    assert.equal(evaluateRule(r, { kind: "date", value: "2021-12-01", variant: "EXEMPTION_NOTICE" }, ctx)[0].status, "ok");
    const atLimit = evaluateRule(r, { kind: "date", value: "2021-12-01", variant: "EXEMPTION_NOTICE" }, { ...ctx, today: "2026-06-04" })[0];
    assert.equal(atLimit.facts.days, warnDays, "exactly at the warn window");
    assert.equal(atLimit.status, "triggered");
    assert.equal(evaluateRule(r, { kind: "date", value: "2021-12-01", variant: "EXEMPTION_NOTICE" }, { ...ctx, today: "2026-06-03" })[0].status, "ok", "181 days → ok");
    // § 60a notice: 3 years → already past
    const special = evaluateRule(r, { kind: "date", value: "2023-01-01", variant: "SPECIAL_ASSESSMENT_60A" }, ctx)[0];
    assert.equal(special.status, "triggered");
    assert.equal(special.facts.dueDate, "2026-01-01");
  });

  test("receipts outside validity and timely use of funds: count/amount > 0", () => {
    assert.equal(evaluateRule(rule("gem.receipt-template-validity"), num(0, "count"), ctx)[0].status, "ok");
    assert.equal(evaluateRule(rule("gem.receipt-template-validity"), num(1, "count"), ctx)[0].status, "triggered");
    const funds = evaluateRule(rule("gem.timely-use-of-funds"), num(1), ctx)[0];
    assert.equal(funds.status, "triggered");
    assert.equal(funds.facts.lagYear, 2024);
    assert.equal(evaluateRule(rule("gem.timely-use-of-funds"), num(0), ctx)[0].status, "ok");
  });

  test("fail closed: missing provider, missing data, wrong shape → unchecked (grey), never green", () => {
    const r = rule("gem.economic-operation-threshold");
    assert.equal(evaluateRule(r, null, ctx)[0].status, "unchecked");
    assert.equal(evaluateRule(r, { kind: "missing", reason: "providerError" }, ctx)[0].status, "unchecked");
    assert.equal(evaluateRule(r, { kind: "date", value: "2026-01-01" }, ctx)[0].status, "unchecked");
    assert.equal(evaluateRule(rule("gem.exemption-notice-expiry"), { kind: "date", value: null }, ctx)[0].status, "unchecked");
    assert.equal(trafficLight([]), "grey");
    assert.equal(trafficLight(evaluateRule(r, null, ctx)), "grey");
    assert.equal(trafficLight([...evaluateRule(r, num(0), ctx), ...evaluateRule(r, null, ctx)]), "grey");
    assert.equal(trafficLight(evaluateRule(r, num(0), ctx)), "green");
    assert.equal(trafficLight(evaluateRule(r, num(10_000_000), ctx)), "red");
  });
});

test("wording: every view carries 'Internal checklist, not tax advice' (TR/DE)", () => {
  const tr = JSON.parse(fs.readFileSync("src/modules/compliance/messages/tr.json", "utf8"));
  const de = JSON.parse(fs.readFileSync("src/modules/compliance/messages/de.json", "utf8"));
  assert.match(tr.disclaimer, /İç kontrol listesi, vergi danışmanlığı değildir/);
  assert.match(de.disclaimer, /Interne Checkliste, keine Steuerberatung/);
  assert.match(fs.readFileSync("src/modules/compliance/views/cockpit-view.tsx", "utf8"), /t\("disclaimer"\)/);
  assert.match(de.secretary.disclaimer, /keine Steuerberatung/);
});

test("providers return aggregates only: no name fields in compliance.ts files", () => {
  for (const mod of ["accounting", "donations", "organization", "courses"]) {
    const src = fs.readFileSync(`src/modules/${mod}/compliance.ts`, "utf8");
    assert.doesNotMatch(src, /firstName|lastName|recipientName|counterparty|email/, mod);
    assert.doesNotMatch(src, /\.(create|update|upsert|delete)\w*\(/, `${mod}: pure reads`);
  }
});
