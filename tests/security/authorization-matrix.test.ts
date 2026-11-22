import assert from "node:assert/strict";
import test from "node:test";

import { permissionResources } from "../../src/permissions-registry";
import { can, effectiveActions, PERMISSION_ACTIONS, type PermissionPolicy } from "../../src/shared/permissions/define";
import { LOCKED_ROLE, SYSTEM_ROLES } from "../../src/shared/roles";

/**
 * SEC2 (#409): registry-driven, synthetic role × resource × action coverage.
 * This checks the shared authorization evaluator, not HTTP route or IDOR enforcement.
 * Pass an explicit policy to avoid relying on request-scoped global state.
 */
test("every registered resource has a deterministic system-role authorization matrix", () => {
  const resources = permissionResources.flatMap(({ moduleKey, definitions }) =>
    definitions.map((definition) => ({ moduleKey, definition })),
  );
  assert.ok(resources.length > 0, "generated permission registry must not be empty");

  const seen = new Set<string>();
  for (const { moduleKey, definition } of resources) {
    assert.ok(moduleKey && definition.resource, "module and resource identifiers are required");
    assert.ok(!seen.has(definition.resource), `duplicate permission resource: ${definition.resource}`);
    seen.add(definition.resource);

    for (const role of SYSTEM_ROLES) {
      const defaults = definition.grants[role];
      assert.ok(Array.isArray(defaults), `${definition.resource} missing ${role} grants`);
      for (const action of PERMISSION_ACTIONS) {
        assert.equal(
          can(role, definition, action, null),
          defaults.includes(action),
          `${moduleKey}/${definition.resource}: ${role} × ${action}`,
        );
      }
    }
  }
});

test("unavailable roles are denied even if their defaults grant access", () => {
  const policy: PermissionPolicy = { overrides: {}, unavailableRoles: SYSTEM_ROLES.filter((role) => role !== LOCKED_ROLE) };
  for (const { definitions } of permissionResources) {
    for (const definition of definitions) {
      for (const role of policy.unavailableRoles) {
        assert.deepEqual(effectiveActions(role, definition, policy), []);
        for (const action of PERMISSION_ACTIONS) assert.equal(can(role, definition, action, policy), false);
      }
    }
  }
});

test("policy overrides cannot escalate beyond ADMIN-supported actions", () => {
  for (const { definitions } of permissionResources) {
    for (const definition of definitions) {
      const supported = definition.grants[LOCKED_ROLE] ?? [];
      const policy: PermissionPolicy = {
        overrides: { VIEWER: { [definition.resource]: [...PERMISSION_ACTIONS] } },
        unavailableRoles: [],
      };
      assert.deepEqual(effectiveActions("VIEWER", definition, policy), PERMISSION_ACTIONS.filter((action) => supported.includes(action)));
      assert.deepEqual(effectiveActions(LOCKED_ROLE, definition, policy), supported);
    }
  }
});
