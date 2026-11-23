import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("financial schemas enforce onDelete: Restrict instead of Cascade (#496)", () => {
  const courses = read("src/modules/courses/schema.prisma");
  assert.match(courses, /course\s+Course\s+@relation\(fields:\s*\[courseId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);
  assert.match(courses, /enrollment\s+CourseEnrollment\s+@relation\(fields:\s*\[enrollmentId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);
  assert.match(courses, /charge\s+CourseCharge\s+@relation\(fields:\s*\[chargeId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);

  const grants = read("src/modules/grants/schema.prisma");
  assert.match(grants, /grant\s+Grant\s+@relation\(fields:\s*\[grantId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);
  assert.doesNotMatch(grants, /onDelete:\s*Cascade/);

  const accounting = read("src/modules/accounting/schema.prisma");
  assert.match(accounting, /import\s+AccountingBankImport\s+@relation\(fields:\s*\[importId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);

  const sepa = read("src/modules/sepa/schema.prisma");
  assert.match(sepa, /run\s+SepaDebitRun\s+@relation\(fields:\s*\[runId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);
  assert.doesNotMatch(sepa, /onDelete:\s*Cascade/);

  const members = read("src/modules/members/schema.prisma");
  assert.match(members, /member\s+Member\s+@relation\(fields:\s*\[memberId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/);
});

test("migration switches all 8 financial foreign keys from CASCADE to RESTRICT", () => {
  const sql = read("prisma/schema/migrations/20261230090000_financial_on_delete_restrict/migration.sql");
  const expectedConstraints = [
    "courses_enrollments_courseId_fkey",
    "courses_charges_enrollmentId_fkey",
    "courses_payments_chargeId_fkey",
    "grant_budget_lines_grantId_fkey",
    "grant_payouts_grantId_fkey",
    "AccountingBankTransaction_importId_fkey",
    "sepa_debit_items_runId_fkey",
    "MemberDue_memberId_fkey",
  ];
  for (const fk of expectedConstraints) {
    assert.match(sql, new RegExp(`DROP CONSTRAINT "${fk}"`));
    assert.match(sql, new RegExp(`ADD CONSTRAINT "${fk}" FOREIGN KEY[\\s\\S]*?ON DELETE RESTRICT`));
  }
});

test("grants service & actions guard against hard-deleting non-PLANNED grants or received payouts", () => {
  const service = read("src/modules/grants/services/grants.ts");
  assert.match(service, /existing\.status !== "PLANNED"[\s\S]*?grants\.errors\.deleteOnlyPlanned/);
  assert.match(service, /payout\.receivedAt !== null[\s\S]*?grants\.errors\.hasReceivedPayouts/);
  assert.match(service, /existing\.receivedAt !== null[\s\S]*?grants\.errors\.payoutAlreadyReceived/);

  const actions = read("src/modules/grants/actions/grant-actions.ts");
  assert.match(actions, /deletePayout\(input\.id,\s*input\.grantId\)/);

  const tr = JSON.parse(read("src/modules/grants/messages/tr.json")) as { errors: Record<string, string> };
  const de = JSON.parse(read("src/modules/grants/messages/de.json")) as { errors: Record<string, string> };
  for (const key of ["deleteOnlyPlanned", "hasReceivedPayouts", "payoutAlreadyReceived"]) {
    assert.ok(tr.errors[key], `Missing TR error key: ${key}`);
    assert.ok(de.errors[key], `Missing DE error key: ${key}`);
  }
});
