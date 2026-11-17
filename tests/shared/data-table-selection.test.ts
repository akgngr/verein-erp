import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSelectedKeys } from "../../src/shared/components/data-table/selection";

test("normalizes explicit selected keys", () => {
  assert.deepEqual(normalizeSelectedKeys(new Set(["a", "b"]), ["a", "b", "c"]), ["a", "b"]);
});

test("normalizes all to currently visible row ids", () => {
  assert.deepEqual(normalizeSelectedKeys("all", ["a", "b", "c"]), ["a", "b", "c"]);
});
