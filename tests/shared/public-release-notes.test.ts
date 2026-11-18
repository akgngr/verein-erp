import assert from "node:assert/strict";
import test from "node:test";
import { publicReleaseNotes, type ModuleRelease } from "../../src/shared/modules/releases";
test("internal notes remain in source but not public output", () => {
 const releases: ModuleRelease[] = [
  { version: "1.1.1", date: "2026-11-17", title: { tr: "İç", de: "Intern" }, changes: [{ type: "internal", tr: "İç", de: "Intern" }] },
  { version: "1.1.0", date: "2026-11-16", title: { tr: "Açık", de: "Öffentlich" }, changes: [{ type: "internal", tr: "Gizli", de: "Intern" }, { type: "fix", tr: "Düzeltme", de: "Fix" }] },
 ];
 const visible = publicReleaseNotes(releases);
 assert.equal(visible.length, 1);
 assert.equal(visible[0].changes.length, 1);
 assert.equal(visible[0].changes[0].type, "fix");
 assert.equal(releases[0].changes.length, 1);
});
