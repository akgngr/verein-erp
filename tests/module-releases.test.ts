import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { checkModuleReleases, compareSemver } from "../scripts/validate-module";

const MODULES_DIR = path.join(process.cwd(), "src", "modules");

test("her modülün releases.json'u geçerli ve module.config.ts sürümüyle aynı", () => {
  for (const key of fs.readdirSync(MODULES_DIR)) {
    const dir = path.join(MODULES_DIR, key);
    if (!fs.existsSync(path.join(dir, "module.config.ts"))) continue;
    assert.deepEqual(checkModuleReleases(dir), [], key);
  }
});

test("semver karşılaştırması", () => {
  assert.ok(compareSemver("1.10.0", "1.9.9") > 0);
  assert.ok(compareSemver("2.0.0", "1.99.99") > 0);
  assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
});
