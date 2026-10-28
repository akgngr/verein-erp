import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { validateAllModules, validateModule } from "../scripts/validate-module";

describe("Verein ERP Module Standardization & Conformance", () => {
  it("all existing modules in src/modules/ pass full validation with 0 errors", () => {
    const results = validateAllModules();
    assert.ok(results.length >= 10, `En az 10 modül bulunmalıdır, bulunan: ${results.length}`);

    const failed = results.filter((r) => !r.valid);
    if (failed.length > 0) {
      const details = failed
        .map((f) => `${f.moduleKey}:\n  ${f.errors.join("\n  ")}`)
        .join("\n\n");
      assert.fail(`Bazı modüller standart denetiminden geçemedi:\n${details}`);
    }

    // Her modülün geçerli olduğunu doğrula
    for (const res of results) {
      assert.equal(res.valid, true, `Modül "${res.moduleKey}" geçerli olmalıdır.`);
      assert.equal(res.errors.length, 0, `Modül "${res.moduleKey}" sıfır hata içermelidir.`);
    }
  });

  it("official modules have topbar declarative menu (menu/top.json)", () => {
    const officialModules = ["accounting", "members", "documents", "meetings", "donations"];
    for (const key of officialModules) {
      const res = validateModule(key);
      assert.equal(res.valid, true);
      assert.equal(res.info.hasTopMenu, true, `${key} modülü menu/top.json içermelidir.`);
      assert.ok(
        (res.info.topMenuItemsCount ?? 0) > 0,
        `${key} modülü en az 1 üst menü öğesine sahip olmalıdır.`,
      );
    }
  });

  it("validator flags missing module.config.ts as error", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verein-mod-test-"));
    const dummyMod = path.join(tempDir, "broken-mod");
    fs.mkdirSync(dummyMod, { recursive: true });

    const res = validateModule("broken-mod", tempDir);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("module.config.ts")));

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("validator flags server-only in index.ts as critical boundary error", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verein-mod-test-"));
    const dummyMod = path.join(tempDir, "leaky-mod");
    fs.mkdirSync(dummyMod, { recursive: true });
    fs.mkdirSync(path.join(dummyMod, "messages"), { recursive: true });

    // Minimum files
    fs.writeFileSync(
      path.join(dummyMod, "module.config.ts"),
      `export const moduleConfig = { key: "leaky-mod", label: "Test", category: "EXTENSION", nav: [] };`,
    );
    fs.writeFileSync(path.join(dummyMod, "permissions.ts"), `export const p = {};`);
    fs.writeFileSync(path.join(dummyMod, "messages", "tr.json"), JSON.stringify({ title: "Test" }));
    fs.writeFileSync(path.join(dummyMod, "messages", "de.json"), JSON.stringify({ title: "Test" }));
    fs.writeFileSync(path.join(dummyMod, "server.ts"), `import "server-only";`);
    fs.writeFileSync(path.join(dummyMod, "ui.ts"), `export {};`);
    
    // Leaky index.ts
    fs.writeFileSync(path.join(dummyMod, "index.ts"), `import "server-only";\nexport const x = 1;`);

    const res = validateModule("leaky-mod", tempDir);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("server-only")));

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("validator flags invalid menu/top.json schema", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verein-mod-test-"));
    const dummyMod = path.join(tempDir, "bad-nav-mod");
    fs.mkdirSync(dummyMod, { recursive: true });
    fs.mkdirSync(path.join(dummyMod, "menu"), { recursive: true });
    fs.mkdirSync(path.join(dummyMod, "messages"), { recursive: true });

    fs.writeFileSync(
      path.join(dummyMod, "module.config.ts"),
      `export const moduleConfig = { key: "bad-nav-mod", label: "Test", category: "EXTENSION", nav: [] };`,
    );
    fs.writeFileSync(path.join(dummyMod, "permissions.ts"), `export const p = {};`);
    fs.writeFileSync(path.join(dummyMod, "messages", "tr.json"), JSON.stringify({ title: "Test" }));
    fs.writeFileSync(path.join(dummyMod, "messages", "de.json"), JSON.stringify({ title: "Test" }));
    fs.writeFileSync(path.join(dummyMod, "server.ts"), `import "server-only";`);
    fs.writeFileSync(path.join(dummyMod, "ui.ts"), `export {};`);
    fs.writeFileSync(path.join(dummyMod, "index.ts"), `export {};`);

    // Invalid top.json: missing leading slash in href
    fs.writeFileSync(
      path.join(dummyMod, "menu", "top.json"),
      JSON.stringify([{ key: "overview", label: "Overview", href: "no-slash-path" }]),
    );

    const res = validateModule("bad-nav-mod", tempDir);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("menu/top.json") && e.includes("'/' ile başlayan")));

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
