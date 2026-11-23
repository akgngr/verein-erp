import assert from "node:assert/strict";
import test from "node:test";

import { can, effectiveActions, type PermissionPolicy } from "../../src/shared/permissions/define";
import { SYSTEM_ROLES } from "../../src/shared/roles";
import { settingsPermissions, systemPermissions } from "../../src/shared/permissions/system";

/**
 * SEC2 synthetic authorization matrix. These tests cover the policy engine,
 * not record-level IDOR: database-backed ownership checks require separate
 * integration tests and must not be inferred from page-level permissions.
 */
const definitions = [settingsPermissions, systemPermissions] as const;
const actions = ["view", "create", "update", "delete", "approve"] as const;

test("SEC2: system roles and actions agree with the permission matrix", () => {
  for (const definition of definitions) {
    for (const role of SYSTEM_ROLES) {
      for (const action of actions) {
        const expected = (definition.grants[role] ?? []).includes(action);
        assert.equal(can(role, definition, action, null), expected,
          `${definition.resource} / ${role} / ${action}`);
      }
    }
  }
});

test("SEC2: a policy override cannot add operations outside administrator-supported actions", () => {
  const policy: PermissionPolicy = {
    overrides: { VIEWER: { system: ["view", "update", "delete", "approve", "create"] } },
    unavailableRoles: [],
  };
  assert.deepEqual(effectiveActions("VIEWER", systemPermissions, policy), ["view", "update", "delete"]);
  assert.equal(can("VIEWER", systemPermissions, "approve", policy), false);
  assert.equal(can("VIEWER", systemPermissions, "create", policy), false);
});

test("SEC2: unavailable roles fail closed even when a policy grants access", () => {
  const policy: PermissionPolicy = {
    overrides: { VIEWER: { system: ["view", "update"] } },
    unavailableRoles: ["VIEWER"],
  };
  for (const action of actions) {
    assert.equal(can("VIEWER", systemPermissions, action, policy), false);
  }
});

test("SEC2: locked administrator is unaffected by malicious policy overrides", () => {
  const policy: PermissionPolicy = {
    overrides: { ADMIN: { system: [], settings: [] } },
    unavailableRoles: ["ADMIN"],
  };
  for (const definition of definitions) {
    for (const action of actions) {
      assert.equal(can("ADMIN", definition, action, policy),
        (definition.grants.ADMIN ?? []).includes(action));
    }
  }
});

test("SEC2: custom roles receive no implicit grants", () => {
  for (const definition of definitions) {
    for (const action of actions) {
      assert.equal(can("CUSTOM_SYNTHETIC", definition, action, null), false);
    }
  }
});
