import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyZeroImports } from "../../scripts/ui/verify-zero-imports";

test("W6 gate rejects one remaining HeroUI import and accepts zero", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "erp-zero-hero-"));
  try {
    const mod = path.join(root, "src/modules/example");
    fs.mkdirSync(mod, { recursive: true });
    assert.equal(verifyZeroImports(root).ok, true);
    fs.writeFileSync(path.join(mod, "ui.tsx"), 'import { Button } from "@heroui/react";');
    const result = verifyZeroImports(root);
    assert.equal(result.ok, false);
    assert.equal(result.count, 1);
    assert.match(result.report, /example\/ui\.tsx/);
    fs.writeFileSync(path.join(mod, "ui.tsx"), 'import { ActionButton } from "@/shared/components/ui/action-button";');
    assert.equal(verifyZeroImports(root).ok, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
