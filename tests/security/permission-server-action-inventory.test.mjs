import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = join(process.cwd(), "scripts/security/permission-surface-inventory.mjs");

test("SEC2 inventory includes server actions regardless of file basename, without treating comments as directives", () => {
  const root = mkdtempSync(join(tmpdir(), "sec2-server-action-"));
  try {
    const dir = join(root, "src/modules/example");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "mutations.ts"), '"use server";\nexport async function updateRecord() {}\n');
    writeFileSync(join(dir, "comment-only.ts"), '// "use server"\nexport function helper() {}\n');
    writeFileSync(join(dir, "page.tsx"), 'export default function Page() { return null; }\n');
    const run = spawnSync(process.execPath, [script, "--json"], { cwd: root, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const { candidates } = JSON.parse(run.stdout);
    const mutation = candidates.find((entry) => entry.path === "src/modules/example/mutations.ts");
    assert.ok(mutation, "nonstandard server-action file must be inventoried");
    assert.ok(mutation.markers.includes("server-action-candidate"));
    assert.equal(candidates.some((entry) => entry.path.endsWith("comment-only.ts")), false);
    assert.ok(candidates.some((entry) => entry.path.endsWith("page.tsx")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
