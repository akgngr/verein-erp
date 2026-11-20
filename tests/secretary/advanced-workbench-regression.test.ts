import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  filterAdvancedItems,
  isSafeSecretaryRoute,
  safeAdvancedItem,
  type AdvancedSecretaryItem,
} from "@/modules/secretary/views/advanced-workbench-policy";

const item: AdvancedSecretaryItem = {
  id: "followup:one",
  kind: "follow-up",
  status: "needs-review",
  title: "Synthetic follow-up",
  description: "No customer data",
  sourceHref: "/sekreter",
  requiresApproval: true,
};

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("advanced secretary rejects unsafe navigation while retaining safe in-app routes", () => {
  for (const safe of ["/sekreter", "/sekreter/takip", "/mail/inbox"]) {
    assert.equal(isSafeSecretaryRoute(safe), true, safe);
  }
  for (const unsafe of [
    "//evil.example/path",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/sekreter?next=//evil.example",
    "/sekreter#fragment",
    "/sekreter/%2e%2e/admin",
    "/sekreter/../admin",
    "/sekreter/./admin",
    "/sekreter/<script>",
    "/sekreter\n",
    "/" + "a".repeat(512),
  ]) {
    assert.equal(isSafeSecretaryRoute(unsafe), false, unsafe);
  }
});

test("advanced secretary handles all six kinds without leaking invalid projections", () => {
  const kinds: AdvancedSecretaryItem["kind"][] = [
    "mail-triage", "follow-up", "weekly-report",
    "ocr-suggestion", "channel-consent", "delegation",
  ];
  assert.deepEqual(
    filterAdvancedItems(kinds.map((kind, index) => ({ ...item, id: `item:${index}`, kind })))
      .map(({ kind }) => kind),
    kinds,
  );
  assert.equal(safeAdvancedItem({ ...item, status: "unknown" as never }), null);
  assert.equal(safeAdvancedItem({ ...item, id: "../invalid" }), null);
  assert.equal(safeAdvancedItem({ ...item, description: "x".repeat(351) }), null);
  assert.equal(safeAdvancedItem({ ...item, sourceHref: "https://evil.example" })?.sourceHref, undefined);
  assert.equal(safeAdvancedItem({ ...item, requiresApproval: false })?.requiresApproval, false);
});

test("advanced secretary bounds rendered collections and does not mutate caller items", () => {
  const supplied = Array.from({ length: 150 }, (_, i) => ({
    ...item,
    id: `followup:${i}`,
  }));
  const before = structuredClone(supplied);
  const result = filterAdvancedItems(supplied);
  assert.equal(result.length, 100);
  assert.equal(result[0].id, "followup:0");
  assert.equal(result[99].id, "followup:99");
  assert.deepEqual(supplied, before);
});

test("invalid leading projections cannot hide later authorized items", () => {
  const invalid = Array.from({ length: 110 }, (_, i) => ({ ...item, id: `invalid:${i}`, status: "invalid" as never }));
  const valid = Array.from({ length: 105 }, (_, i) => ({ ...item, id: `followup:valid-${i}` }));
  const result = filterAdvancedItems([...invalid, ...valid]);
  assert.equal(result.length, 100);
  assert.equal(result[0].id, "followup:valid-0");
  assert.equal(result[99].id, "followup:valid-99");
});

test("read-only workbench keeps an accessible, translated, action-free rendering contract", () => {
  const view = read("src/modules/secretary/views/advanced-workbench-view.tsx");
  const labels = read("src/modules/secretary/views/advanced-workbench-labels.ts");

  // Static contract checks complement, but do not replace, real browser smoke tests.
  assert.match(view, /<section aria-label=\{labels\.title\}/);
  assert.match(view, /<ul className=/);
  assert.match(view, /<li key=\{item\.id\}/);
  assert.match(view, /filterAdvancedItems\(items\)/);
  assert.match(view, /labels\.approvalRequired/);
  assert.match(view, /focus-visible:/);
  assert.match(view, /lg:grid-cols-2/);
  assert.doesNotMatch(view, /<button\b|<form\b|onClick=|onSubmit=/);
  assert.doesNotMatch(view, /@heroui\/react|dangerouslySetInnerHTML/);
  assert.match(labels, /getTranslations\("secretary"\)/);
  for (const key of [
    "advancedTitle", "advancedEmpty", "advancedApprovalRequired",
    "advancedMail", "advancedFollowUp", "advancedWeeklyReport",
    "advancedOcr", "advancedChannel", "advancedDelegation",
  ]) {
    assert.ok(labels.includes(`ui.${key}`), key);
  }
});
