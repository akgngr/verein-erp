import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildComplianceExportMarkdown,
  COMPLIANCE_DISCLAIMER,
  formatComputedValue,
} from "@/modules/compliance/services/export-report";
import type { CockpitRow } from "@/modules/compliance/services/run";

test("buildComplianceExportMarkdown includes StBerG disclaimer in TR and DE and formats computed values", () => {
  const sampleRows: CockpitRow[] = [
    {
      rule: {
        id: "gem.economic-operation-threshold",
        version: 2,
        title: { tr: "İktisadi işletme sınırı", de: "Wirtschaftlicher Geschäftsbetrieb" },
        legalSource: [{ norm: "§ 64 Abs. 3 AO", url: "https://www.gesetze-im-internet.de/ao_1977/__64.html" }],
        effective: { from: "2026-01-01", to: null },
        severity: "warn",
        review: { status: "reviewed", reviewerRole: "tax-advisor", reviewedAt: "2026-11-20", reviewedBy: "StB" },
      },
      mode: "active",
      findings: [
        {
          ruleId: "gem.economic-operation-threshold",
          ruleVersion: 2,
          period: 2026,
          status: "triggered",
          severity: "warn",
          facts: { value: 46000 },
          message: { tr: "46.000 EUR sınırın üzerinde", de: "46.000 EUR über der Grenze" },
        },
      ],
    },
  ];

  const mdDe = buildComplianceExportMarkdown({ year: 2026, lang: "de", rows: sampleRows, preview: false });
  assert.ok(mdDe.includes(COMPLIANCE_DISCLAIMER.de));
  assert.ok(mdDe.includes("46000"));
  assert.ok(mdDe.includes("https://www.gesetze-im-internet.de/ao_1977/__64.html"));
  assert.ok(mdDe.includes("v2"));

  const mdTr = buildComplianceExportMarkdown({ year: 2026, lang: "tr", rows: sampleRows, preview: true });
  assert.ok(mdTr.includes(COMPLIANCE_DISCLAIMER.tr));
  assert.ok(mdTr.includes("Önizleme"));
  assert.equal(formatComputedValue({ value: 123, count: 4 }), "value: 123, count: 4");
});

test("cockpit UI components include year switcher, preview toggle, legal source links, and export action", () => {
  const viewSrc = fs.readFileSync(path.join(process.cwd(), "src/modules/compliance/views/cockpit-view.tsx"), "utf8");
  const toolbarSrc = fs.readFileSync(path.join(process.cwd(), "src/modules/compliance/components/cockpit-toolbar.tsx"), "utf8");

  assert.match(viewSrc, /ComplianceCockpitToolbar/);
  assert.match(viewSrc, /source\.url/);
  assert.match(viewSrc, /formatComputedValue/);
  assert.match(viewSrc, /askAdvisorLink/);
  assert.match(toolbarSrc, /exportComplianceReportAction/);
  assert.match(toolbarSrc, /preview/);
});
