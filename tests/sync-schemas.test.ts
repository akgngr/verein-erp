import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { syncModuleSchemas } from "../src/shared/modules/sync-schemas";

describe("Modular Prisma Schemas Synchronizer", () => {
  test("syncModuleSchemas links module schemas into prisma/schema/", () => {
    const result = syncModuleSchemas();
    assert.strictEqual(Array.isArray(result.synced), true);
    assert.strictEqual(Array.isArray(result.removed), true);

    const schemaDir = path.join(process.cwd(), "prisma", "schema");
    assert.ok(fs.existsSync(schemaDir), "prisma/schema dizini var olmalıdır");

    // base.prisma ana generator ve datasource dosyasıdır
    assert.ok(fs.existsSync(path.join(schemaDir, "base.prisma")));

    // Modül şemaları mevcuttur
    const expectedModules = ["auth", "members", "accounting", "documents", "meetings", "donations"];
    for (const mod of expectedModules) {
      const linkPath = path.join(schemaDir, `${mod}.prisma`);
      assert.ok(fs.existsSync(linkPath), `${mod}.prisma bağlantısı mevcut olmalıdır`);
    }
  });
});
