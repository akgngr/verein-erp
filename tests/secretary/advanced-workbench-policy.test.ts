import assert from "node:assert/strict";
import { test } from "node:test";

import {
  filterAdvancedItems,
  isSafeSecretaryRoute,
  safeAdvancedItem,
  type AdvancedSecretaryItem,
} from "@/modules/secretary/views/advanced-workbench-policy";

test("advanced secretary links cannot navigate outside local authorized routes", () => {
  assert.equal(isSafeSecretaryRoute("/sekreter"), true);
  assert.equal(isSafeSecretaryRoute("/evrak/liste"), true);
  for (const href of ["//evil.test", "https://evil.test", "/%2f%2fevil", "/foo?redirect=//evil", "/foo#fragment", "/../admin", "/foo\\bar", "/"]) {
    assert.equal(isSafeSecretaryRoute(href), false, href);
  }
});

const valid: AdvancedSecretaryItem = {
  id: "mail:triage_123",
  kind: "mail-triage",
  status: "needs-review",
  title: "Approval required",
  description: "Only an approved, minimized projection",
  requiresApproval: true,
  sourceHref: "/mail",
};

test("advanced secretary strips unsafe navigation and enforces bounded types", () => {
  assert.deepEqual(safeAdvancedItem(valid), valid);
  assert.equal(safeAdvancedItem({ ...valid, sourceHref: "//outside.invalid" })?.sourceHref, undefined);
  assert.equal(safeAdvancedItem({ ...valid, id: "" }), null);
  assert.equal(safeAdvancedItem({ ...valid, title: "x".repeat(161) }), null);
  assert.equal(safeAdvancedItem({ ...valid, kind: "unsafe" as never }), null);
  assert.equal(filterAdvancedItems([valid, { ...valid, title: "" }]).length, 1);
});
