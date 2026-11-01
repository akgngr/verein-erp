import assert from "node:assert/strict";
import { test } from "node:test";

import { clearRefs, demoPerson } from "../src/shared/demo/define";

test("demo kişiler kurgusaldır (example.com, 000 telefon)", () => {
  for (let i = 0; i < 60; i++) {
    const p = demoPerson(i);
    assert.match(p.email, /@example\.com$/);
    assert.match(p.phone, /^\+49 30 0000\d{4}$/);
  }
});

test("clearRefs bağımlıları önce siler ve silinemeyenleri döndürür", async () => {
  const order: string[] = [];
  const failed = await clearRefs(
    [
      { model: "parent", id: "p1" },
      { model: "child", id: "c1" },
      { model: "child", id: "c2" },
    ],
    {
      parent: async (ids) => {
        order.push(`parent:${ids.join()}`);
      },
      child: async (ids) => {
        order.push(`child:${ids.join()}`);
        if (ids.includes("c2")) throw new Error("fk");
      },
    },
  );
  assert.equal(order[0], "child:c1,c2");
  assert.ok(order.includes("parent:p1"));
  assert.deepEqual(failed, [{ model: "child", id: "c2" }]);
});
