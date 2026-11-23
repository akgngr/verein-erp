import assert from "node:assert/strict";
import test from "node:test";

import { can, effectiveActions, type PermissionPolicy } from "../../src/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "../../src/shared/permissions/system";

/**
 * SEC2: explicit permission revocation and request-scoped policy evaluation.
 * These synthetic evaluator tests do not replace database-backed IDOR tests.
 */
test("SEC2: an empty override revokes default grants instead of falling back", () => {
  const revoked: PermissionPolicy = {
    overrides: { BOARD: { system: [] } },
    unavailableRoles: [],
  };
  assert.equal(can("BOARD", systemPermissions, "view", null), true);
  assert.deepEqual(effectiveActions("BOARD", systemPermissions, revoked), []);
  assert.equal(can("BOARD", systemPermissions, "view", revoked), false);
  assert.equal(can("BOARD", systemPermissions, "view", null), true);
});

test("SEC2: revoking one resource leaves unrelated resources unchanged", () => {
  const policy: PermissionPolicy = {
    overrides: { BOARD: { system: [] } },
    unavailableRoles: [],
  };
  for (const action of ["view", "update", "delete"] as const) {
    assert.equal(can("BOARD", settingsPermissions, action, policy),
      can("BOARD", settingsPermissions, action, null));
  }
  assert.equal(can("BOARD", systemPermissions, "view", policy), false);
});

test("SEC2: explicit policies are evaluated without mutating their grants", () => {
  const policy: PermissionPolicy = {
    overrides: { VIEWER: { system: ["view", "update", "approve"] } },
    unavailableRoles: [],
  };
  const snapshot = structuredClone(policy);
  const before = [...systemPermissions.grants.ADMIN];
  assert.equal(can("VIEWER", systemPermissions, "approve", policy), false);
  assert.equal(can("VIEWER", systemPermissions, "update", policy), true);
  assert.deepEqual(policy, snapshot);
  assert.deepEqual(systemPermissions.grants.ADMIN, before);
});
