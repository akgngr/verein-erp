import assert from "node:assert/strict";
import test from "node:test";

import { permissionResources } from "../../src/permissions-registry";
import { PERMISSION_ACTIONS } from "../../src/shared/permissions/define";
import { LOCKED_ROLE, SYSTEM_ROLES } from "../../src/shared/roles";

/**
 * SEC2 (#409): validate the generated permission registry's declared grants.
 * This is a registry integrity check, not a substitute for route/action IDOR tests.
 */
test("registered role grants contain only supported, nonduplicate actions", () => {
  let checked = 0;
  const validActions = new Set<string>(PERMISSION_ACTIONS);
  for (const { moduleKey, definitions } of permissionResources) {
    for (const definition of definitions) {
      const supported = new Set<string>(definition.grants[LOCKED_ROLE] ?? []);
      for (const [role, actions] of Object.entries(definition.grants)) {
        assert.ok(Array.isArray(actions), `${moduleKey}/${definition.resource}/${role}: grants must be an array`);
        assert.equal(
          new Set(actions).size,
          actions.length,
          `${moduleKey}/${definition.resource}/${role}: duplicate grant`,
        );
        for (const action of actions) {
          assert.ok(validActions.has(action), `${moduleKey}/${definition.resource}/${role}: unknown action ${action}`);
          assert.ok(supported.has(action), `${moduleKey}/${definition.resource}/${role}: action exceeds ADMIN support`);
        }
        checked++;
      }
      for (const role of SYSTEM_ROLES) {
        assert.ok(Object.hasOwn(definition.grants, role), `${moduleKey}/${definition.resource}: missing ${role}`);
      }
    }
  }
  assert.ok(checked > 0, "permission registry must contain role grants");
});
