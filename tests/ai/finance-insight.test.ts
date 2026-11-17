import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { FINANCE_INSIGHT_TOOLS, parseInsightJson } from "@/modules/ai/services/finance-insight-parse";
import { AI_TOOL_POLICY } from "@/shared/data-policy";

test("parseInsightJson: kod bloğundaki JSON okunur, şema dışı yanıt reddedilir", () => {
  const parsed = parseInsightJson('```json\n{"status":"watch","headline":"Likidite yeterli, alacaklar artıyor.","points":["Açık alacak 4.200 EUR."],"actions":["Vadesi geçenleri kontrol et."]}\n```');
  assert.equal(parsed?.status, "watch");
  assert.equal(parseInsightJson('{"status":"great","headline":"x","points":["y"]}'), null);
  assert.equal(parseInsightJson('{"status":"good","headline":"x","points":[]}'), null);
  assert.equal(parseInsightJson("no json"), null);
});

test("durum analizi yalnız muhasebenin toplam (aggregate/internal) v2 araçlarını okur", () => {
  for (const name of FINANCE_INSIGHT_TOOLS) {
    const policy = AI_TOOL_POLICY[name as keyof typeof AI_TOOL_POLICY] as { module?: string } | undefined;
    assert.equal(policy?.module, "accounting", `${name} accounting politikasında olmalı`);
  }
  const source = fs.readFileSync("src/modules/accounting/ai.ts", "utf8");
  for (const name of FINANCE_INSIGHT_TOOLS) {
    const block = source.slice(source.indexOf(`name: "${name}"`));
    const policyLine = block.slice(0, block.indexOf("run:"));
    assert.doesNotMatch(policyLine, /pseudonymous/, `${name} kişi verisi sınıfında olmamalı`);
  }
});

test("durum analizi araç vermez ve sohbet kapılarını (availableTools/runTool) kullanır", () => {
  const source = fs.readFileSync("src/modules/ai/services/finance-insight.ts", "utf8");
  assert.match(source, /availableTools\(/);
  assert.match(source, /runTool\(/);
  assert.match(source, /tools: \[\]/);
});
