import assert from "node:assert/strict";
import test from "node:test";

import { boundedSet, getConditionInfo } from "@/modules/weather/services/weather";

// #585: Hava durumu önbelleği sınırlıdır; kar kodları kar simgesiyle eşleşir.
test("weather caches evict the oldest entry beyond the limit", () => {
  const map = new Map<string, number>();
  for (let index = 0; index < 5; index += 1) boundedSet(map, `k${index}`, index, 3);
  assert.deepEqual([...map.keys()], ["k2", "k3", "k4"]);
  boundedSet(map, "k2", 99, 3);
  assert.deepEqual([...map.keys()], ["k3", "k4", "k2"], "re-set refreshes recency");
});

test("all WMO snow codes map to the snow icon", () => {
  for (const code of [71, 73, 75, 77, 85, 86]) assert.equal(getConditionInfo(code).icon, "snow", String(code));
});
