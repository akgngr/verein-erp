import test from "node:test";
import assert from "node:assert/strict";

import { assignedToMeCondition } from "@/modules/tasks/queries/assignee-identity";

// #584: "Bana atananlar" yalnız kullanıcının üye kaydına atanmış görevleri içerir; oluşturduğu görevler değil.
test("assigned-to-me filters by assignee only, never by creator", () => {
  assert.deepEqual(assignedToMeCondition(["m1", "m2"]), { memberId: { in: ["m1", "m2"] } });
  const condition = JSON.stringify(assignedToMeCondition([]));
  assert.equal(condition.includes("createdById"), false);
  assert.deepEqual(assignedToMeCondition([]), { memberId: { in: [] } });
});
