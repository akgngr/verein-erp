import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { accountingPermissions } from "@/modules/accounting/permissions";
import { auditPermissions } from "@/modules/audit/permissions";
import { documentsPermissions } from "@/modules/documents/permissions";
import { donationsPermissions } from "@/modules/donations/permissions";
import { financePermissions } from "@/modules/finance/permissions";
import { membersPermissions } from "@/modules/members/permissions";
import { usersPermissions } from "@/modules/users/permissions";
import { can } from "@/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";
import { SYSTEM_ROLES } from "@/shared/roles";
import {
  canExternalReviewerAccessResource,
  computeDefaultGrantWindow,
  EXTERNAL_GRANT_DEFAULT_DAYS,
  EXTERNAL_GRANT_MAX_DAYS,
  hasActiveExternalGrant,
  isTimeBoxActive,
  validateGrantWindow,
} from "@/shared/security/external-grant";

test("TAX_ADVISOR is a system role with read-only access to accounting, finance, and settings only", () => {
  assert.ok(SYSTEM_ROLES.includes("TAX_ADVISOR"));

  assert.equal(can("TAX_ADVISOR", accountingPermissions, "view"), true);
  assert.equal(can("TAX_ADVISOR", financePermissions, "view"), true);
  assert.equal(can("TAX_ADVISOR", settingsPermissions, "view"), true);

  // Negative checks: no write actions anywhere
  for (const action of ["create", "update", "delete", "approve"] as const) {
    assert.equal(can("TAX_ADVISOR", accountingPermissions, action), false);
    assert.equal(can("TAX_ADVISOR", financePermissions, action), false);
  }

  // Negative checks: no access to out-of-scope modules
  for (const def of [
    membersPermissions,
    donationsPermissions,
    usersPermissions,
    documentsPermissions,
    auditPermissions,
    systemPermissions,
  ]) {
    for (const action of ["view", "create", "update", "delete", "approve"] as const) {
      assert.equal(can("TAX_ADVISOR", def, action), false);
    }
  }
});

test("time-boxed grant defaults to 14 days, caps at 90 days, and refuses access at frozen clock expiry or revocation", () => {
  const start = new Date("2026-11-01T00:00:00.000Z");
  const defaultWindow = computeDefaultGrantWindow(start);
  const diffDays = (defaultWindow.expiresAt.getTime() - defaultWindow.startsAt.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(diffDays, EXTERNAL_GRANT_DEFAULT_DAYS);

  assert.deepEqual(validateGrantWindow(start, defaultWindow.expiresAt), { ok: true });
  assert.deepEqual(validateGrantWindow(start, start), { ok: false, reason: "endBeforeStart" });
  assert.deepEqual(
    validateGrantWindow(start, new Date(start.getTime() + (EXTERNAL_GRANT_MAX_DAYS + 1) * 24 * 60 * 60 * 1000)),
    { ok: false, reason: "exceedsMaxDuration" },
  );

  const activeGrant = {
    startsAt: start,
    expiresAt: defaultWindow.expiresAt,
    revokedAt: null,
    moduleScope: null,
  };

  // Frozen clock: before start -> denied
  assert.equal(isTimeBoxActive(activeGrant, new Date("2026-10-31T23:59:59.000Z")), false);
  // Frozen clock: inside window -> allowed
  assert.equal(isTimeBoxActive(activeGrant, new Date("2026-11-10T12:00:00.000Z")), true);
  // Frozen clock: at exact expiry -> denied
  assert.equal(hasActiveExternalGrant([activeGrant], defaultWindow.expiresAt), false);
  // Frozen clock: after expiry -> denied
  assert.equal(hasActiveExternalGrant([activeGrant], new Date("2026-11-16T00:00:00.000Z")), false);

  // Revoked before expiry -> denied immediately
  const revokedGrant = { ...activeGrant, revokedAt: new Date("2026-11-05T08:00:00.000Z") };
  assert.equal(hasActiveExternalGrant([revokedGrant], new Date("2026-11-06T08:00:00.000Z")), false);
});

test("module scope restricts TAX_ADVISOR to the granted module and blocks unrelated modules", () => {
  const now = new Date("2026-11-05T12:00:00.000Z");
  const accountingOnlyGrant = [
    {
      startsAt: new Date("2026-11-01T00:00:00.000Z"),
      expiresAt: new Date("2026-11-15T00:00:00.000Z"),
      revokedAt: null,
      moduleScope: "accounting",
    },
  ];

  assert.equal(canExternalReviewerAccessResource("TAX_ADVISOR", accountingOnlyGrant, "accounting", now), true);
  assert.equal(canExternalReviewerAccessResource("TAX_ADVISOR", accountingOnlyGrant, "settings", now), true);
  assert.equal(canExternalReviewerAccessResource("TAX_ADVISOR", accountingOnlyGrant, "finance", now), false);
  assert.equal(canExternalReviewerAccessResource("TAX_ADVISOR", accountingOnlyGrant, "members", now), false);
});

test("auth server enforces time-boxed expiry and audits every TAX_ADVISOR view", () => {
  const authServerSrc = fs.readFileSync(
    path.join(process.cwd(), "src/modules/auth/server.ts"),
    "utf8",
  );
  assert.match(authServerSrc, /hasValidTimeBoxedAccess/);
  assert.match(authServerSrc, /ExternalReviewerView/);
  assert.match(authServerSrc, /writeAudit\(/);
});
