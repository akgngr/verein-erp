import assert from "node:assert/strict";
import { test } from "node:test";

import { enabledDependents, findDependencyCycles, planEnable, satisfiesVersion, withRequirements } from "../src/shared/modules/dependencies";

const mods = [
  { key: "students", version: "1.1.0" },
  { key: "courses", version: "1.2.0", requires: [{ module: "students", version: ">=1.1.0" }], recommends: ["progress"] },
  { key: "progress", version: "1.0.1", requires: [{ module: "courses" }] },
  { key: "banking", version: "1.0.0", requires: [{ module: "accounting" }] },
];

test("sürüm koşulu", () => {
  assert.ok(satisfiesVersion("1.2.0", ">=1.1.0"));
  assert.ok(satisfiesVersion("1.1.0", "1.1.0"));
  assert.ok(!satisfiesVersion("1.0.9", ">=1.1.0"));
  assert.ok(!satisfiesVersion(undefined, ">=1.0.0"));
  assert.ok(satisfiesVersion("0.1.0", undefined));
});

test("etkinleştirme planı: dolaylı zorunlular, önerilenler, eksikler", () => {
  const none = () => false;
  assert.deepEqual(planEnable("progress", mods, none), { enable: ["students", "courses"], missing: [], recommended: [] });
  assert.deepEqual(planEnable("courses", mods, none), { enable: ["students"], missing: [], recommended: ["progress"] });
  assert.deepEqual(planEnable("courses", mods, (key) => key === "students").enable, []);
  assert.deepEqual(planEnable("banking", mods, none).missing, [{ module: "accounting", version: undefined, installed: undefined }]);
  const old = [{ key: "students", version: "1.0.0" }, mods[1]];
  assert.equal(planEnable("courses", old, none).missing[0].module, "students");
});

test("kapatma: açık bağımlılar (dolaylı dahil)", () => {
  const on = (key: string) => ["students", "courses", "progress"].includes(key);
  assert.deepEqual(enabledDependents("students", mods, on), ["courses", "progress"]);
  assert.deepEqual(enabledDependents("progress", mods, on), []);
});

test("döngü ve hazır ayar genişletme", () => {
  assert.deepEqual(findDependencyCycles(mods), []);
  const cyc = [{ key: "a", requires: [{ module: "b" }] }, { key: "b", requires: [{ module: "a" }] }];
  assert.equal(findDependencyCycles(cyc).length, 1);
  assert.deepEqual(withRequirements(["progress"], mods).sort(), ["courses", "progress", "students"]);
});
