import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");
const tr = JSON.parse(read("src/modules/system/messages/tr.json")) as Record<string, unknown>;
const de = JSON.parse(read("src/modules/system/messages/de.json")) as Record<string, unknown>;

describe("B001 F2b UI architecture", () => {
  it("routes both views through the system module and permission-gated server views", () => {
    const privacy = read("src/modules/system/views/privacy-presets-view.tsx");
    const report = read("src/modules/system/views/egress-report-view.tsx");
    for (const view of [privacy, report]) {
      assert.match(view, /requirePermission\(systemPermissions, "view"\)/);
      assert.match(view, /ForbiddenError/);
      assert.match(view, /AccessDenied/);
      assert.match(view, /idPrefix="system-/);
    }
    assert.match(privacy, /can\(user.role, systemPermissions, "update"\)/);
    assert.match(read("src/modules/system/routes/gizlilik/page.tsx"), /PrivacyPresetsView/);
    assert.match(read("src/modules/system/routes/veri-cikisi/page.tsx"), /EgressReportView/);
    const config = read("src/modules/system/module.config.ts");
    assert.match(config, /href: "\/ayarlar\/gizlilik"/);
    assert.match(config, /href: "\/ayarlar\/veri-cikisi"/);
  });

  it("preview is read-only and apply requires explicit approval with server action", () => {
    const component = read("src/modules/system/components/privacy-presets-panel.tsx");
    assert.match(component, /previewPrivacyPresetAction/);
    assert.match(component, /applyPrivacyPresetAction/);
    assert.match(component, /approved: true/);
    assert.match(component, /setApproved\(false\)/);
    assert.match(component, /!approved \|\| !preview/);
    assert.match(component, /idPrefix/);
    assert.match(component, /@\/shared\/components\/kit/);
    assert.doesNotMatch(component, /@heroui\/react/);
    assert.doesNotMatch(component, /useId\(/);
    assert.doesNotMatch(component, /Math\.random\(/);
  });

  it("renders three separate datasets, instead of treating enabled state as history", () => {
    const component = read("src/modules/system/components/egress-report-panel.tsx");
    assert.match(component, /report\.configuration\.modules/);
    assert.match(component, /report\.actualTransfers\.entries/);
    assert.match(component, /report\.providerRetention\.map/);
    assert.match(component, /report\.actualTransfers\.totalCalls/);
    assert.match(component, /idPrefix/);
    assert.match(component, /overflow-x-auto/);
    assert.match(component, /@\/shared\/components\/kit/);
    assert.doesNotMatch(component, /@heroui\/react/);
    assert.doesNotMatch(component, /Math\.random\(/);
  });

  it("provides equivalent TR and DE keys, all preset and reporting labels", () => {
    for (const key of ["privacyUi", "egressUi"]) {
      assert.deepEqual(Object.keys(tr[key] as object).sort(), Object.keys(de[key] as object).sort());
    }
    for (const lang of [tr, de]) {
      const privacy = lang.privacyUi as Record<string, unknown>;
      const presets = privacy.presets as Record<string, Record<string, string>>;
      assert.deepEqual(Object.keys(presets).sort(), ["Connected", "Standard", "Strict"]);
      for (const preset of Object.values(presets)) {
        assert.ok(preset.label);
        assert.ok(preset.description);
      }
      assert.ok((lang.egressUi as Record<string, string>).retentionNotice);
    }
  });
});
