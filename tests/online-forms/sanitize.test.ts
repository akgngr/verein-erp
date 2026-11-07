import assert from "node:assert/strict";
import { test } from "node:test";
import { documentHtmlToText, sanitizeDocumentHtml } from "@/modules/online-forms/lib/sanitize";

test("sanitizeDocumentHtml betik ve olay özniteliklerini kaldırır", () => {
  const html = sanitizeDocumentHtml('<p onclick="x()">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a>');
  assert.ok(!/script|onclick|onerror|javascript:|<img/i.test(html));
  assert.match(html, /<p>Hi<\/p>/);
});

test("sanitizeDocumentHtml biçimi ve güvenli bağlantıları korur", () => {
  const html = sanitizeDocumentHtml('<h2 style="text-align:center;color:red">T</h2><table><tbody><tr><td>a</td></tr></tbody></table><a href="https://example.test">x</a>');
  assert.match(html, /text-align:center/);
  assert.ok(!html.includes("color"));
  assert.match(html, /<table>/);
  assert.match(html, /rel="noopener noreferrer[^"]*"/);
});

test("documentHtmlToText düz metin üretir", () => {
  const text = documentHtmlToText("<h1>Başlık</h1><p>Bir &amp; iki</p><ul><li>a</li></ul>");
  assert.match(text, /Başlık/);
  assert.match(text, /Bir & iki/);
  assert.ok(!text.includes("<"));
});
