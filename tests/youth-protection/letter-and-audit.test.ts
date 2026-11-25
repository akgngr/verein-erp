import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildFeeExemptionLetterText, escapeLetterHtml } from "@/modules/youth-protection/services/fee-exemption-letter";

// #585: Harç muafiyeti yazısı ve denetim kaydı (§ 72a Abs. 5 SGB VIII, DSGVO md. 10).

test("the letter uses the organization profile instead of placeholders", () => {
  const text = buildFeeExemptionLetterText({ personName: "Anna Muster", organizationName: "TSV Köln e.V.", organizationCity: "Köln", dateStr: "01.02.2030" });
  assert.match(text, /^TSV Köln e\.V\./);
  assert.match(text, /Köln, den 01\.02\.2030/);
  assert.doesNotMatch(text, /Unser Verein e\.V\.|Berlin/);
});

test("printed letters escape HTML (no script execution from names)", () => {
  assert.equal(escapeLetterHtml(`<img src=x onerror="alert(1)">&'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
  for (const file of ["fee-exemption-letter-modal.tsx", "fee-exemption-letter-drawer-content.tsx"]) {
    const source = fs.readFileSync(`src/modules/youth-protection/components/${file}`, "utf8");
    assert.match(source, /<body>\$\{escapeLetterHtml\(letterText\)\}<\/body>/, file);
  }
});

test("audit entries never contain the person's name", () => {
  const source = fs.readFileSync("src/modules/youth-protection/actions/item-actions.ts", "utf8");
  const auditCalls = source.match(/await audit\(\{[\s\S]*?\}\);/g) ?? [];
  assert.ok(auditCalls.length >= 3);
  for (const call of auditCalls) assert.doesNotMatch(call, /personName/);
});
