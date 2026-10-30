import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_RESOURCES_META,
  ALL_ROLES_META,
} from "../src/modules/users/permissions-matrix";
import { can } from "../src/shared/permissions/define";
import type { Role } from "../src/shared/roles";

describe("Roles and Permissions Matrix", () => {
  const allRoles: Role[] = ["ADMIN", "BOARD", "SECRETARY", "TREASURER", "AUDITOR", "VIEWER", "TEACHER"];

  test("all 7 system roles are documented with metadata", () => {
    assert.strictEqual(ALL_ROLES_META.length, 7);
    const documentedRoles = ALL_ROLES_META.map((r) => r.role);
    for (const role of allRoles) {
      assert.ok(documentedRoles.includes(role), `${role} rolü dokümante edilmiş olmalıdır`);
    }
  });

  test("all registered resources have valid definitions and supported actions", () => {
    assert.ok(ALL_RESOURCES_META.length >= 10, "En az 10 kaynak tanımlı olmalıdır");
    for (const res of ALL_RESOURCES_META) {
      assert.ok(res.moduleKey, "moduleKey zorunludur");
      assert.ok(res.resourceKey, "resourceKey zorunludur");
      assert.ok(res.definition, "definition zorunludur");
      assert.ok(Array.isArray(res.supportedActions), "supportedActions dizi olmalıdır");
      assert.ok(res.supportedActions.length > 0, "en az bir eylem olmalıdır");

      // Her rol ve eylem için can() hatasız boolean dönmelidir
      for (const role of allRoles) {
        for (const action of res.supportedActions) {
          const result = can(role, res.definition, action);
          assert.strictEqual(typeof result, "boolean");
        }
      }
    }
  });

  test("ADMIN has unrestricted access across core operational resources", () => {
    for (const res of ALL_RESOURCES_META) {
      for (const action of res.supportedActions) {
        assert.strictEqual(
          can("ADMIN", res.definition, action),
          true,
          `ADMIN ${res.resourceKey}:${action} yetkisine sahip olmalıdır`,
        );
      }
    }
  });

  test("AUDITOR cannot modify or delete any resources", () => {
    for (const res of ALL_RESOURCES_META) {
      assert.strictEqual(
        can("AUDITOR", res.definition, "create"),
        false,
        `AUDITOR ${res.resourceKey} üzerinde oluşturma yapamamalıdır`,
      );
      assert.strictEqual(
        can("AUDITOR", res.definition, "delete"),
        false,
        `AUDITOR ${res.resourceKey} üzerinde silme yapamamalıdır`,
      );
    }
  });
});
