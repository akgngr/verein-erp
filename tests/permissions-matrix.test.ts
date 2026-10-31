import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { permissionResources } from "../src/permissions-registry";
import { can, definePermissions, effectiveActions, type PermissionPolicy } from "../src/shared/permissions/define";
import { SYSTEM_ROLES } from "../src/shared/roles";

const all = permissionResources.flatMap((entry) => entry.definitions.map((definition) => ({ moduleKey: entry.moduleKey, definition })));
const empty: PermissionPolicy = { overrides: {}, unavailableRoles: [] };

describe("Roller ve izinler (veritabanı politikası)", () => {
  test("kayıt tüm modüllerin izin kaynaklarını otomatik toplar ve tekrar etmez", () => {
    assert.ok(all.length >= 20, "en az 20 kaynak beklenir");
    const resources = all.map((item) => item.definition.resource);
    assert.equal(new Set(resources).size, resources.length, "kaynaklar benzersiz olmalı");
    for (const key of ["courses", "progress", "students", "exports", "events", "tasks"]) assert.ok(resources.includes(key), `${key} kaynağı listede olmalı`);
  });

  test("her kaynak sistem rollerinin hepsini tanımlar ve ADMIN tüm desteklenen işlemlere sahiptir", () => {
    for (const { definition } of all) {
      for (const role of SYSTEM_ROLES) assert.ok(Array.isArray(definition.grants[role]), `${definition.resource}: ${role} tanımlı olmalı`);
      for (const action of definition.grants.ADMIN) assert.equal(can("ADMIN", definition, action, empty), true);
    }
  });

  test("AUDITOR varsayılan olarak kayıt oluşturamaz/silemez (kendi dosyaları hariç)", () => {
    for (const { definition } of all.filter((item) => item.definition.resource !== "exports")) {
      assert.equal(can("AUDITOR", definition, "create", empty), false, `${definition.resource}: create`);
      assert.equal(can("AUDITOR", definition, "delete", empty), false, `${definition.resource}: delete`);
    }
  });

  const sample = definePermissions("sample", { ADMIN: ["view", "create", "delete"], BOARD: ["view"], SECRETARY: [], TREASURER: [], AUDITOR: [], VIEWER: [], TEACHER: ["view"] });

  test("yönetici değişikliği varsayılanı ezer; desteklenmeyen işlem verilemez", () => {
    const policy: PermissionPolicy = { overrides: { BOARD: { sample: ["view", "create", "approve"] } }, unavailableRoles: [] };
    assert.deepEqual(effectiveActions("BOARD", sample, policy), ["view", "create"]);
    assert.equal(can("SECRETARY", sample, "view", policy), false);
  });

  test("ADMIN kilitlidir: değişiklik ve pasif modül onu etkilemez", () => {
    const policy: PermissionPolicy = { overrides: { ADMIN: { sample: [] } }, unavailableRoles: ["ADMIN"] };
    assert.equal(can("ADMIN", sample, "delete", policy), true);
  });

  test("modülü kullanılamayan rolün hiçbir izni yoktur", () => {
    assert.equal(can("TEACHER", sample, "view", empty), true);
    assert.equal(can("TEACHER", sample, "view", { overrides: {}, unavailableRoles: ["TEACHER"] }), false);
  });

  test("özel rol yalnızca verilen izinlere sahiptir", () => {
    const policy: PermissionPolicy = { overrides: { C_KOORDINATOR: { sample: ["view"] } }, unavailableRoles: [] };
    assert.equal(can("C_KOORDINATOR", sample, "view", policy), true);
    assert.equal(can("C_KOORDINATOR", sample, "create", policy), false);
    assert.equal(can("C_BASKA", sample, "view", policy), false);
  });

  test("kapsam izinleri bugünkü davranışla aynı varsayılanlara sahiptir", () => {
    const find = (resource: string) => all.find((item) => item.definition.resource === resource)!.definition;
    const coursesAll = find("coursesAll");
    assert.equal(can("TEACHER", coursesAll, "view", empty), false, "öğretmen yalnızca kendi kurslarını görür");
    for (const role of SYSTEM_ROLES) assert.equal(can(role, coursesAll, "view", empty), true);
    const identity = find("memberIdentity");
    assert.deepEqual(SYSTEM_ROLES.filter((role) => can(role, identity, "view", empty)), ["ADMIN", "BOARD", "SECRETARY"]);
    assert.deepEqual(SYSTEM_ROLES.filter((role) => can(role, find("progressNotesAll"), "delete", empty)), ["ADMIN"]);
    // Yönetici bir özel role "tüm kurslar" verebilir.
    assert.equal(can("C_X", coursesAll, "view", { overrides: { C_X: { coursesAll: ["view"] } }, unavailableRoles: [] }), true);
  });
});
