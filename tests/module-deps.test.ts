import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { declaredDependencies, externalPackagesIn, packageNameOf, rangesCompatible } from "../src/shared/modules/module-deps";

describe("Modül npm bağımlılıkları", () => {
  test("paket adı içe aktarma yolundan çıkarılır", () => {
    assert.equal(packageNameOf("qrcode"), "qrcode");
    assert.equal(packageNameOf("qrcode/lib/browser"), "qrcode");
    assert.equal(packageNameOf("@scope/pkg/sub"), "@scope/pkg");
    assert.equal(packageNameOf("@/shared/db"), null);
    assert.equal(packageNameOf("./x"), null);
    assert.equal(packageNameOf("node:fs"), null);
  });

  test("dış paketler bulunur; yorumlar, dahili yollar ve Node modülleri sayılmaz", () => {
    const source = `
      import QRCode from "qrcode";
      import type { X } from "@scope/types";
      import { db } from "@/shared/db";
      import fs from "fs";
      export { y } from "./y";
      const lazy = await import("pdf-lib");
      // import Ornek from "yorumdaki-paket";
      /* import Blok from "blok-yorum"; */
      const url = "https://example.com"; // import Z from "z";
    `;
    assert.deepEqual(externalPackagesIn(source).sort(), ["@scope/types", "pdf-lib", "qrcode"]);
  });

  test("module.config.ts içindeki bildirim okunur", () => {
    const config = `export const moduleConfig = { key: "x", dependencies: { qrcode: "^1.5.4", "@scope/pkg": "~2.0.0" }, nav: [] };`;
    assert.deepEqual(declaredDependencies(config), { qrcode: "^1.5.4", "@scope/pkg": "~2.0.0" });
    assert.deepEqual(declaredDependencies(`export const moduleConfig = { key: "x" };`), {});
  });

  test("sürüm aralığı uyumluluğu", () => {
    assert.equal(rangesCompatible("^19.0.0", "^19.2.0"), true);
    assert.equal(rangesCompatible("^19.0.0", "^17.0.0"), false);
    assert.equal(rangesCompatible("^1.5.4", "1.5.4"), true);
  });
});
