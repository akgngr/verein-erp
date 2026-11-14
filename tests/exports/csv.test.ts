import test from "node:test";
import assert from "node:assert/strict";
import { csvFormat, safeCsvCell } from "@/modules/exports/formats/csv";

test("CSV neutralizes text formulas including leading controls without corrupting negative numbers", () => {
  for (const input of ['=1+1', '+SUM(A1)', '-cmd|test', '@SUM(A1)', '\t=1+1', '\r@SUM(A1)', '  =HYPERLINK("https://example.com")']) {
    assert.ok(safeCsvCell(input).replace(/^"/, "").startsWith("'"), JSON.stringify(input));
  }
  assert.equal(safeCsvCell('-12,50'), '-12,50');
  assert.equal(safeCsvCell('-12.50'), '-12.50');
  assert.equal(safeCsvCell('normal'), 'normal');
  assert.equal(safeCsvCell('one;two'), '"one;two"');
  assert.equal(safeCsvCell('a\rb'), '"a\rb"');
});

test("CSV renderer protects both table header and data cells", async () => {
  const bytes = await csvFormat.render({title:"Test",markdown:'| =1+1 | Amount |\n| --- | --- |\n| @SUM(A1) | -12,50 |',createdAt:new Date()}, {} as Parameters<typeof csvFormat.render>[1]);
  const csv = Buffer.from(bytes).toString('utf8');
  assert.ok(csv.includes("'=1+1;Amount"));
  assert.ok(csv.includes("'@SUM(A1);-12,50"));
});
