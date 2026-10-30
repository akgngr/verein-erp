import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { allModules } from "../src/registry";
import { accessSignature, isAccessApproved } from "../src/shared/modules/module-access";
import { exportedMethods } from "../src/shared/modules/sync-routes";
import { declaredAccess, findServerImports, operationFor } from "../scripts/validate-module";

describe("Modüller arası erişim izni", () => {
  test("onay kuralları: resmi modül onaylı gelir, eklenti izin bekler, geri alma ve imza değişimi onayı düşürür", () => {
    const access = [{ module: "users", operations: ["read" as const] }];
    const signature = accessSignature(access);
    const approval = { signature, approvedAt: "", approvedBy: "" };
    assert.equal(isAccessApproved({ category: "OFFICIAL", access }, undefined), true);
    assert.equal(isAccessApproved({ category: "EXTENSION", access }, undefined), false);
    assert.equal(isAccessApproved({ category: "EXTENSION", access }, approval), true);
    assert.equal(isAccessApproved({ category: "OFFICIAL", access }, { revoked: true, revokedAt: "" }), false);
    assert.equal(isAccessApproved({ category: "EXTENSION", access: [{ module: "users", operations: ["write"] }] }, approval), false);
    assert.equal(isAccessApproved({ category: "EXTENSION", access: [] }, undefined), true);
  });

  test("imza sıradan bağımsızdır ve işlem tekrarını yok sayar", () => {
    const a = accessSignature([
      { module: "users", operations: ["write", "read"] },
      { module: "accounting", operations: ["read", "read"] },
    ]);
    const b = accessSignature([
      { module: "accounting", operations: ["read"] },
      { module: "users", operations: ["read", "write"] },
    ]);
    assert.equal(a, b);
    assert.equal(a, "accounting:read|users:read,write");
    assert.equal(accessSignature(undefined), "");
  });

  test("içe aktarılan addan işlem türü çıkarılır", () => {
    assert.equal(operationFor("listMemberOptions"), "read");
    assert.equal(operationFor("getStudentPayer"), "read");
    assert.equal(operationFor("createSourcedBooking"), "write");
    assert.equal(operationFor("sendMail"), "write");
    assert.equal(operationFor("updateMemberAction"), "write");
    assert.equal(operationFor("deleteMemberAction"), "delete");
  });

  test("access bildirimi config metninden okunur", () => {
    const declared = declaredAccess('access: [\n { module: "users", operations: ["read", "write"] },\n { module: "mail", operations: ["write"] },\n],');
    assert.deepEqual([...declared.get("users")!], ["read", "write"]);
    assert.deepEqual([...declared.get("mail")!], ["write"]);
  });

  test("tüm modüllerin server kullanımı bildirilmiştir", () => {
    for (const mod of allModules) {
      const declared = new Map((mod.access ?? []).map((request) => [request.module, new Set(request.operations)]));
      for (const [target, names] of findServerImports(`src/modules/${mod.key}`, mod.key)) {
        const granted = declared.get(target);
        assert.ok(granted, `${mod.key} → ${target} bildirilmemiş`);
        for (const name of names) assert.ok(granted.has(operationFor(name)), `${mod.key} → ${target}.${name} için ${operationFor(name)} izni yok`);
      }
    }
  });

  test("API köprüsü kaynaktaki HTTP yöntemlerini bulur", () => {
    assert.deepEqual(exportedMethods("src/modules/students/api/datev-debitoren/route.ts"), ["GET"]);
    assert.deepEqual(exportedMethods("src/modules/auth/api/[...nextauth]/route.ts"), ["GET", "POST"]);
  });
});
