import assert from "node:assert/strict";
import test from "node:test";

import { permissionResources } from "../../src/permissions-registry";
import { can, PERMISSION_ACTIONS, type PermissionPolicy } from "../../src/shared/permissions/define";
import { LOCKED_ROLE } from "../../src/shared/roles";

/**
 * SEC2 (#409): synthetic policy isolation regression.
 *
 * These checks model two independent request/tenant policies against the same
 * registry definition. They do NOT claim to test database record ownership,
 * route middleware or real IDOR enforcement.
 */
test("explicit request policies cannot leak authorization between tenants", () => {
  const definition = permissionResources
    .flatMap(({ definitions }) => definitions)
    .find((candidate) => (candidate.grants[LOCKED_ROLE] ?? []).length > 0);

  assert.ok(definition, "at least one registered resource must support an action");
  const action = PERMISSION_ACTIONS.find((candidate) => definition.grants[LOCKED_ROLE].includes(candidate));
  assert.ok(action, "a supported action is required");

  const tenantA: PermissionPolicy = {
    overrides: { VIEWER: { [definition.resource]: [action] } },
    unavailableRoles: [],
  };
  const tenantB: PermissionPolicy = {
    overrides: { VIEWER: { [definition.resource]: [action] } },
    unavailableRoles: ["VIEWER"],
  };

  assert.equal(can("VIEWER", definition, action, tenantA), true);
  assert.equal(can("VIEWER", definition, action, tenantB), false);
  assert.equal(can("VIEWER", definition, action, tenantA), true, "tenant B must not mutate tenant A");
  assert.deepEqual(tenantA.unavailableRoles, []);
  assert.deepEqual(tenantB.unavailableRoles, ["VIEWER"]);
});

test("a policy override for one resource never grants another resource", () => {
  const definitions = permissionResources.flatMap(({ definitions }) => definitions);
  const first = definitions.find((definition) => (definition.grants[LOCKED_ROLE] ?? []).length > 0);
  assert.ok(first);
  const second = definitions.find((definition) =>
    definition.resource !== first.resource && (definition.grants[LOCKED_ROLE] ?? []).length > 0,
  );
  assert.ok(second, "at least two independent resources must be registered");

  const firstAction = first.grants[LOCKED_ROLE][0];
  const secondAction = second.grants[LOCKED_ROLE][0];
  const policy: PermissionPolicy = {
    overrides: {
      VIEWER: {
        [first.resource]: [firstAction],
        [second.resource]: [],
      },
    },
    unavailableRoles: [],
  };

  assert.equal(can("VIEWER", first, firstAction, policy), true);
  assert.equal(can("VIEWER", second, secondAction, policy), false);
});
