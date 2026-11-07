import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createBlock, designFromText, designSchema, inlineMarkup, renderEmailHtml, renderEmailText, safeUrl, type EmailDesign } from "@/modules/mailings/lib/email-design";

const texts = { heading: "Hallo {firstName}", text: "Text", button: "Mehr", footer: "Abmelden" };

describe("Email design", () => {
  test("text is escaped; light markup and placeholders are kept", () => {
    const html = inlineMarkup("<script>x</script> **fett** *kursiv* [Link](https://ex.test) {firstName}", "#000000");
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("<strong>fett</strong>") && html.includes("<em>kursiv</em>"));
    assert.ok(html.includes('href="https://ex.test"'));
    assert.ok(html.includes("{firstName}"));
  });

  test("unsafe links are dropped", () => {
    assert.equal(safeUrl("javascript:alert(1)"), null);
    assert.equal(safeUrl("data:text/html,x"), null);
    assert.equal(safeUrl("https://"), null);
    assert.equal(safeUrl("mailto:a@b.de"), "mailto:a@b.de");
    assert.equal(safeUrl("{eventLink}"), "{eventLink}");
    assert.ok(!inlineMarkup("[x](javascript:alert(1))", "#000000").includes("href"));
  });

  test("full design renders table-based HTML and readable plain text", () => {
    const design: EmailDesign = {
      ...designFromText("Hallo {firstName}", "Abmelden"),
      blocks: [
        createBlock("heading", texts),
        createBlock("button", texts),
        { ...createBlock("columns", texts), columns: [[createBlock("text", texts) as never], [createBlock("image", texts) as never]] } as never,
        createBlock("footer", texts),
      ],
    };
    (design.blocks[1] as { url: string }).url = "https://verein.example/fest";
    assert.ok(designSchema.safeParse(design).success);
    const html = renderEmailHtml(design, "Vorschau");
    assert.match(html, /^<!doctype html>/);
    assert.ok(html.includes('role="presentation"'));
    assert.ok(html.includes('href="https://verein.example/fest"'));
    assert.ok(html.includes('class="col"'));
    const text = renderEmailText(design);
    assert.ok(text.startsWith("HALLO {FIRSTNAME}"));
    assert.ok(text.includes("Mehr: https://verein.example/fest"));
  });

  test("schema rejects foreign or malformed blocks", () => {
    assert.equal(designSchema.safeParse({ version: 1, settings: designFromText("x").settings, blocks: [{ id: "a", type: "script", code: "x" }] }).success, false);
    assert.equal(designSchema.safeParse({ ...designFromText("x"), settings: { ...designFromText("x").settings, background: "red;}" } }).success, false);
  });
});
