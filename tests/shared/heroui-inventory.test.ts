import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectInventory, toMarkdown } from "../../scripts/ui/heroui-inventory";

test("HeroUI inventory parses imports without counting comments and other libraries", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "erp-ui-inventory-"));
  try {
    const a = path.join(dir, "src/modules/alpha");
    const b = path.join(dir, "src/modules/beta");
    fs.mkdirSync(a, { recursive: true });
    fs.mkdirSync(b, { recursive: true });
    fs.writeFileSync(path.join(a, "widget.tsx"), [
      '// import { Bogus } from "@heroui/react";',
      'import { Button as Alias, type Chip } from "@heroui/react";',
      'import { toast } from "@heroui/react";',
      'import { Something } from "other-library";',
    ].join("\n"));
    fs.writeFileSync(path.join(b, "widget.ts"), 'import * as Hero from "@heroui/react";');
    const report = collectInventory(dir);
    assert.equal(report.directImportFiles, 2);
    assert.equal(report.directImportDeclarations, 3);
    assert.equal(report.directImportingModules, 2);
    assert.equal(report.componentUses.Button, 1);
    assert.equal(report.componentUses.Chip, 1);
    assert.equal(report.componentUses.toast, 1);
    assert.equal(report.componentUses["*"], 1);
    assert.ok(!report.componentUses.Bogus);
    assert.match(toMarkdown(report), /alpha/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
