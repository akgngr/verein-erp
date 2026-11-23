import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/security/permission-surface-inventory.mjs");

test("SEC2 inventory is deterministic, read-only, and does not mistake markers for authorization", () => {
  const root = mkdtempSync(join(tmpdir(), "sec2-inventory-"));
  const fixture = (path: string, source: string) => {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  };
  try {
    fixture("src/app/(dashboard)/page.tsx", "export default function Page() { return null; }");
    fixture("src/app/api/demo/route.ts", "const check = requirePermission;");
    fixture("src/modules/demo/actions.ts", "export async function save() {}");
    fixture("src/shared/permissions/permissions.ts", "const definition = definePermissions;");
    fixture("src/modules/demo/generated/page.tsx", "requirePermission");
    fixture("src/modules/demo/other.ts", "requirePermission");
    fixture("src/modules/demo/node_modules/page.ts", "requirePermission");
    fixture("src/modules/demo/notes.md", "requirePermission");
    const run = () => execFileSync(process.execPath, [script, "--json"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });
    const first = run();
    assert.equal(run(), first, "output should be stable across runs");
    const report = JSON.parse(first) as {
      schemaVersion: number;
      candidates: Array<{ path: string; markers: string[] }>;
    };
    assert.equal(report.schemaVersion, 1);
    assert.deepEqual(report.candidates.map(({ path }) => path), [
      "src/app/(dashboard)/page.tsx",
      "src/app/api/demo/route.ts",
      "src/modules/demo/actions.ts",
      "src/shared/permissions/permissions.ts",
    ]);
    assert.deepEqual(report.candidates[0]?.markers, ["entry-point"]);
    assert.deepEqual(report.candidates[1]?.markers, ["entry-point", "guard-reference"]);
    assert.deepEqual(report.candidates[2]?.markers, ["entry-point"]);
    assert.deepEqual(report.candidates[3]?.markers, ["permission-file", "permission-definition"]);
    assert.equal(report.candidates.some(({ path }) => path.includes("generated")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SEC2 inventory tolerates missing source directories", () => {
  const root = mkdtempSync(join(tmpdir(), "sec2-empty-"));
  try {
    const output = execFileSync(process.execPath, [script, "--json"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.deepEqual(JSON.parse(output), { schemaVersion: 1, candidates: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
