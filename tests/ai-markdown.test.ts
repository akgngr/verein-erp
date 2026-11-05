import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { toInternalMarkdownHref } from "../src/shared/markdown/links";
import { parseMarkdown } from "../src/shared/markdown/parse";

describe("Sohbet markdown çözümleyici", () => {
  test("markdown bağlantıları uygulama içinde kalır", () => {
    assert.equal(toInternalMarkdownHref("/members"), "/members");
    assert.equal(toInternalMarkdownHref("//evil.example"), "/evil.example");
    assert.equal(toInternalMarkdownHref("/\\\\evil.example"), "/evil.example");
  });

  test("GFM tablo, hizalama ve eksik hücreler", () => {
    const blocks = parseMarkdown("**Toplam:** 1\n\n| Statü | Sayısı |\n|-------|-------:|\n| Aktif üye | 1 |\n| Pasif üye |\n\nSon.");
    assert.equal(blocks.length, 3);
    assert.deepEqual(blocks[1], { type: "table", header: ["Statü", "Sayısı"], align: ["left", "right"], rows: [["Aktif üye", "1"], ["Pasif üye", ""]] });
  });

  test("başlık, madde ve numaralı liste", () => {
    const blocks = parseMarkdown("## Özet\n- a\n- b\n1. bir\n2. iki");
    assert.deepEqual(blocks.map((block) => block.type), ["heading", "list", "list"]);
    assert.deepEqual(blocks[2], { type: "list", ordered: true, items: ["bir", "iki"] });
  });

  test("ayırıcısız boru içeren satır paragraf kalır", () => {
    assert.deepEqual(parseMarkdown("| sadece | satır |"), [{ type: "paragraph", text: "| sadece | satır |" }]);
  });
});
