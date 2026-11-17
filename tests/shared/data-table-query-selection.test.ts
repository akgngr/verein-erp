import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPageSelection,
  buildQuerySnapshot,
  selectedCount,
  selectedIdsForPage,
  sameQuerySnapshot,
  validateQuerySelectionFilters,
} from "../../src/shared/data-table/selection-contract";

test("explicit selection returns only selected visible ids", () => {
  assert.deepEqual(
    selectedIdsForPage({ type: "explicit", ids: ["a", "c"] }, ["a", "b", "c"]),
    ["a", "c"],
  );
});

test("query selection selects all visible ids except exclusions", () => {
  assert.deepEqual(
    selectedIdsForPage(
      { type: "query", query: { filters: {} }, excludedIds: ["b"] },
      ["a", "b", "c"],
    ),
    ["a", "c"],
  );
});

test("query selection preserves exclusions from other pages", () => {
  const next = applyPageSelection(
    { type: "query", query: { filters: {} }, excludedIds: ["old", "b"] },
    ["a"],
    ["a", "b"],
  );
  assert.deepEqual(next, {
    type: "query",
    query: { filters: {} },
    excludedIds: ["old", "b"],
  });
});

test("selected count subtracts query exclusions", () => {
  assert.equal(
    selectedCount(
      { type: "query", query: { filters: {} }, excludedIds: ["x", "y"] },
      42,
    ),
    40,
  );
});

test("query snapshot captures all filter.* params", () => {
  const params = new URLSearchParams("filter.status=ACTIVE&filter.from=2026-01-01&page=2");
  assert.deepEqual(
    buildQuerySnapshot(params, { q: "ali", sort: "name", dir: "asc" }),
    {
      q: "ali",
      filters: { status: "ACTIVE", from: "2026-01-01" },
      sort: "name",
      dir: "asc",
    },
  );
});

test("server validation rejects undeclared filter keys", () => {
  assert.throws(
    () =>
      validateQuerySelectionFilters(
        {
          type: "query",
          query: { filters: { status: "ACTIVE", secret: "x" } },
          excludedIds: [],
        },
        ["status"],
      ),
    /DATA_TABLE_FILTER_NOT_ALLOWED:secret/,
  );
});

test("query snapshot comparison ignores filter key order", () => {
  assert.equal(
    sameQuerySnapshot(
      { q: "x", filters: { a: "1", b: "2" }, sort: "name", dir: "asc" },
      { q: "x", filters: { b: "2", a: "1" }, sort: "name", dir: "asc" },
    ),
    true,
  );
});

test("query snapshot comparison detects filter changes", () => {
  assert.equal(
    sameQuerySnapshot(
      { filters: { status: "ACTIVE" } },
      { filters: { status: "INACTIVE" } },
    ),
    false,
  );
});
