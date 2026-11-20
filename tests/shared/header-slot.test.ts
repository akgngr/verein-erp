/** RFC-002 / #419 — üst çubuk eylemleri: yalnız kullanılabilir modüller, kararlı sıra. */
import assert from "node:assert/strict";
import test from "node:test";

import { defineModuleHeader, usableHeaderActions } from "@/shared/header/define";

test("yalnız kullanılabilir modüllerin eylemleri, order sonra modül adına göre", () => {
  const registry = [
    defineModuleHeader({ module: "help-center", actions: [{ key: "help", order: 20, render: () => "H" }] }),
    defineModuleHeader({ module: "notifications", actions: [{ key: "bell", order: 10, render: () => "B" }] }),
    defineModuleHeader({ module: "unlicensed-thing", actions: [{ key: "x", order: 0, render: () => "X" }] }),
  ];
  const actions = usableHeaderActions(registry, ["notifications", "help-center"]);
  assert.deepEqual(actions.map((action) => `${action.module}:${action.key}`), ["notifications:bell", "help-center:help"]);
  assert.deepEqual(usableHeaderActions(registry, []), [], "lisanssız/pasif modül çizilmez");
});
