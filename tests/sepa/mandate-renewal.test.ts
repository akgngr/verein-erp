import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import { membersPermissions } from "@/modules/members/permissions";
import { onlineFormsPermissions } from "@/modules/online-forms/permissions";
import { studentsPermissions } from "@/modules/students/permissions";
import { can } from "@/shared/permissions/define";
import { needsRenewal, RENEWAL_ISSUES } from "@/modules/sepa/lib/mandate-health";

// #521 — e-sign mandate renewal from the SEPA coach. Synthetic data only.
const read = (file: string) => fs.readFileSync(file, "utf8");

describe("SEPA mandate renewal via e-sign (#521)", () => {
  test("renewal is offered for issues a new signed mandate fixes, and for renewMandate advice", () => {
    for (const issue of ["missingIban", "invalidIban", "missingReference", "missingSignatureDate", "futureSignatureDate", "dormant", "renewAfterReturn"] as const) {
      assert.equal(needsRenewal([issue], null), true, issue);
    }
    assert.equal(needsRenewal(["pausedAfterReturns"], null), false, "repeated returns alone need contact, not a new mandate");
    assert.equal(needsRenewal(["missingHolder"], null), false);
    assert.equal(needsRenewal([], "renewMandate"), true);
    assert.equal(needsRenewal([], "retry"), false);
    assert.equal(RENEWAL_ISSUES.has("pausedAfterReturns"), false);
  });

  test("permission: online-forms create plus update on the subject's module", () => {
    const contract = read("src/modules/online-forms/services/mandate-renewal.ts");
    assert.match(contract, /if \(!can\(role, onlineFormsPermissions, "create"\)\) return false;/);
    assert.match(contract, /kind === "MEMBER" \? can\(role, membersPermissions, "update"\) : can\(role, studentsPermissions, "update"\)/);
    // The same rule evaluated on the real definitions: admins may, viewers and auditors may not.
    const rule = (role: string, kind: "MEMBER" | "GUARDIAN") => can(role, onlineFormsPermissions, "create") && (kind === "MEMBER" ? can(role, membersPermissions, "update") : can(role, studentsPermissions, "update"));
    assert.equal(rule("ADMIN", "MEMBER"), true);
    assert.equal(rule("ADMIN", "GUARDIAN"), true);
    assert.equal(rule("VIEWER", "MEMBER"), false);
    assert.equal(rule("AUDITOR", "GUARDIAN"), false);
  });

  test("the target is resolved on the server from source + sourceKey, never from client ids", () => {
    const actions = read("src/modules/sepa/actions/sepa-actions.ts");
    const action = actions.slice(actions.indexOf("export async function requestMandateRenewalAction"));
    assert.match(action, /sourceKey: z\.string\(\)/);
    assert.doesNotMatch(action, /subjectId: z\.|memberId: z\.|guardianId: z\./, "no subject id is accepted from the client");
    assert.match(action, /\(await candidates\(input\.source, input\.param, await labels\(\)\)\)\.find\(\(item\) => item\.sourceKey === input\.sourceKey\)\?\.subject/);
    assert.match(action, /canRequestRenewal\(user\.role, subject\.kind\)/);
    assert.match(action, /after: \{ purpose: "sepaMandateRenewal", kind: subject\.kind, channel: input\.channel \}/, "audit holds ids and channel only");
  });

  test("course fees resolve the guardian by debtor number (no name or email matching)", () => {
    const runs = read("src/modules/sepa/services/runs.ts");
    assert.match(runs, /getGuardianIdsByDebtorNumber\(debtorNumbers\)/);
    assert.match(runs, /subject: guardianId \? \{ kind: "GUARDIAN" as const, subjectId: guardianId \} : null/);
    assert.match(runs, /subject: \{ kind: "MEMBER" as const, subjectId: due\.memberId \}/);
    const students = read("src/modules/students/services/online-form.ts");
    assert.match(students, /select: \{ id: true, debtorNumber: true \}/, "the students contract returns ids only");
  });

  test("the subject never reaches the client and addresses stay masked", () => {
    const health = read("src/modules/sepa/services/health.ts");
    assert.match(health, /rows: rows\.map\(\(\{ subject: _subject, \.\.\.row \}\) => row\)/);
    const contract = read("src/modules/online-forms/services/mandate-renewal.ts");
    assert.match(contract, /previewTarget\(item\.kind, item\.subjectId\)/, "masked addresses come from the existing preview");
    assert.doesNotMatch(contract, /email: true|phone: true|iban/i);
  });

  test("nothing is sent without an explicit confirmation step in the UI", () => {
    const ui = read("src/modules/sepa/components/mandate-health.tsx");
    assert.match(ui, /onPress=\{\(\) => setRenewing\(/, "the first click only opens the confirmation");
    assert.match(ui, /onPress=\{send\}/, "sending happens on the confirm button");
  });
});
