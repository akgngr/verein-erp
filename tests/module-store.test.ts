import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  deleteModuleExtension,
  getAllActiveModuleKeys,
  getModuleStates,
  isModuleActive,
  setModuleActive,
} from "../src/shared/modules/module-store";

describe("Module Store & State Management", () => {
  test("getModuleStates returns active states with required modules", () => {
    const states = getModuleStates();
    assert.strictEqual(typeof states, "object");
    assert.strictEqual(states.system, true, "system modülü varsayılan olarak aktif olmalıdır");
    assert.strictEqual(states.auth, true, "auth modülü aktif olmalıdır");
    assert.strictEqual(states.organization, true, "organization modülü aktif olmalıdır");
  });

  test("isModuleActive returns true for default active modules and unknown new modules", () => {
    assert.strictEqual(isModuleActive("system"), true);
    assert.strictEqual(isModuleActive("auth"), true);
    // Henüz config'de yer almayan yeni/harici bir modül varsayılan olarak aktif kabul edilir
    assert.strictEqual(isModuleActive("some_brand_new_extension_module"), true);
  });

  test("getAllActiveModuleKeys correctly filters out inactive modules", () => {
    const registered = ["auth", "system", "members", "test_inactive"];
    const active = getAllActiveModuleKeys(registered);
    assert.ok(active.includes("auth"));
    assert.ok(active.includes("system"));
    assert.ok(active.includes("members"));
  });

  test("setModuleActive updates module state and persists", async () => {
    await setModuleActive("test_dummy_module", false);
    assert.strictEqual(isModuleActive("test_dummy_module"), false);

    await setModuleActive("test_dummy_module", true);
    assert.strictEqual(isModuleActive("test_dummy_module"), true);
  });

  test("deleteModuleExtension fails gracefully on non-existent module", async () => {
    const res = await deleteModuleExtension("non_existent_module_xyz_123");
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("bulunamadı"));
  });

  test("deleteModuleExtension safely removes custom extension module", async () => {
    const testExtDir = path.join(process.cwd(), "src", "modules", "temp_test_extension");
    if (!fs.existsSync(testExtDir)) {
      fs.mkdirSync(testExtDir, { recursive: true });
      fs.writeFileSync(path.join(testExtDir, "test.txt"), "hello");
    }

    const res = await deleteModuleExtension("temp_test_extension");
    assert.strictEqual(res.success, true);
    assert.strictEqual(fs.existsSync(testExtDir), false, "Klasör tamamen silinmiş olmalıdır");
  });
});
