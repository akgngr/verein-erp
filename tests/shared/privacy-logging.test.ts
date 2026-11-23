import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { maskEmail } from "@/shared/automation/trace";

// #498 — CWE-532 / DSGVO Art. 5(1)(c) ve Art. 17.
const read = (file: string) => fs.readFileSync(file, "utf8");
const SCRIPTS = ["prisma/seed.ts", "scripts/reset-admin.ts", "scripts/create-test-users.ts", "scripts/seed-test-users.ts"];

describe("Privacy in operator scripts and audit (#498)", () => {
  test("maskEmail keeps only the first character and the domain", () => {
    assert.equal(maskEmail("admin@verein.example"), "a***@verein.example");
    assert.equal(maskEmail("no-at-sign"), "***");
  });

  test("seed and admin scripts never print a plain email or the test password", () => {
    for (const file of SCRIPTS) {
      const logs = read(file).split("\n").filter((line) => /console\.(log|info|warn|error)\(/.test(line));
      for (const line of logs) {
        assert.doesNotMatch(line, /\$\{(email|user\.email|spec\.email)\}/, `${file}: ${line.trim()}`);
        assert.doesNotMatch(line, /Test@12345/, `${file}: ${line.trim()}`);
      }
    }
  });

  test("deleting a user does not copy name or email into the audit log", () => {
    const source = read("src/modules/users/actions/delete-user.ts");
    const before = source.match(/before:\s*\{([^}]*)\}/)?.[1] ?? "";
    assert.ok(before.length > 0, "audit before payload found");
    assert.doesNotMatch(before, /\bname\b|\bemail\b/);
  });
});
