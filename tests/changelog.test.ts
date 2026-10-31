import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import changelog from "../src/modules/system/changelog.json";

describe("Sürüm notları", () => {
  test("en üstteki sürüm package.json sürümüyle aynıdır", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };
    assert.equal(changelog.releases[0].version, pkg.version);
  });
  test("sürümler azalan sırada, benzersiz ve her değişikliğin tr/de metni var", () => {
    const versions = changelog.releases.map((release) => release.version);
    assert.equal(new Set(versions).size, versions.length);
    const sorted = [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    assert.deepEqual(versions, sorted);
    for (const release of changelog.releases) for (const change of release.changes) assert.ok(change.tr && change.de);
  });
});
