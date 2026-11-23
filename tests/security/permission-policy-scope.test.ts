import assert from "node:assert/strict";
import test from "node:test";

import {
  can,
  effectiveActions,
  type PermissionPolicy,
} from "../../src/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "../../src/shared/permissions/system";

/**
 * SEC2: synthetic request/tenant policy isolation at the permission evaluator.
 * These tests do NOT establish database row-level ownership or API IDOR protection.
 * Every check passes its policy explicitly to avoid relying on process-global state.
 */
test("SEC2: policies from separate synthetic tenants never affect one another", () => {
  const tenantA: PermissionPolicy = {
    overrides: { VIEWER: { system: ["view"] } },
    unavailableRoles: [],
  };
  const tenantB: PermissionPolicy = {
    overrides: {},
    unavailableRoles: ["VIEWER"],
  };

  assert.equal(can("VIEWER", systemPermissions, "view", tenantA), true);
  assert.equal(can("VIEWER", systemPermissions, "view", tenantB), false);
  assert.equal(can("VIEWER", systemPermissions, "view", tenantA), true);
  assert.equal(can("VIEWER", systemPermissions, "view", null), false);
});

test("SEC2: resource overrides cannot authorize a different resource", () => {
  const policy: PermissionPolicy = {
    overrides: { VIEWER: { system: ["view", "update"] } },
    unavailableRoles: [],
  };

  assert.deepEqual(effectiveActions("VIEWER", systemPermissions, policy), ["view", "update"]);
  assert.deepEqual(effectiveActions("VIEWER", settingsPermissions, policy), ["view"]);
  assert.equal(can("VIEWER", settingsPermissions, "update", policy), false);
});

test("SEC2: one user's disabled role does not change another policy evaluation", () => {
  const disabled: PermissionPolicy = {
    overrides: { BOARD: { system: ["view"] } },
    unavailableRoles: ["BOARD"],
  };
  const enabled: PermissionPolicy = {
    overrides: {},
    unavailableRoles: [],
  };

  assert.equal(can("BOARD", systemPermissions, "view", disabled), false);
  assert.equal(can("BOARD", systemPermissions, "view", enabled), true);
  assert.equal(can("BOARD", systemPermissions, "view", disabled), false);
});

test("SEC2: a custom role receives only explicitly scoped supported actions", () => {
  const policy: PermissionPolicy = {
    overrides: { SYNTHETIC_REVIEWER: { system: ["view", "approve"] } },
    unavailableRoles: [],
  };

  assert.deepEqual(effectiveActions("SYNTHETIC_REVIEWER", systemPermissions, policy), ["view"]);
  assert.equal(can("SYNTHETIC_REVIEWER", settingsPermissions, "view", policy), false);
  assert.equal(can("SYNTHETIC_REVIEWER", systemPermissions, "approve", policy), false);
});
