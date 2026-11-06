import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { discoverRoutes } from "../../scripts/check-hydration";

describe("Hydration smoke test route discovery", () => {
  test("finds static dashboard pages, strips route groups and skips dynamic segments", () => {
    const routes = discoverRoutes();
    assert.ok(routes.includes("/"));
    assert.ok(routes.includes("/automation"));
    assert.ok(routes.includes("/automation/workflows"));
    assert.ok(routes.every((route) => !route.includes("(") && !route.includes("[")));
  });
});
