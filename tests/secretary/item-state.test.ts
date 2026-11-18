import assert from "node:assert/strict";
import { test } from "node:test";

import { itemRefSchema, snoozeSchema } from "@/modules/secretary/schemas/item-state";
import {
  auditMeta,
  dismissItem,
  ItemStateError,
  type ItemStateStore,
  restoreItem,
  snoozeItem,
} from "@/modules/secretary/services/item-state";

type Row = { id: string; userId: string; itemId: string; state: string; until: Date | null };

function memoryStore() {
  const rows: Row[] = [];
  const store: ItemStateStore = {
    upsert: async ({ userId, itemId, state, until }) => {
      const existing = rows.find((r) => r.userId === userId && r.itemId === itemId);
      if (existing) Object.assign(existing, { state, until });
      else rows.push({ id: `r${rows.length + 1}`, userId, itemId, state, until });
      return { id: (existing ?? rows[rows.length - 1]).id };
    },
    remove: async ({ userId, itemId }) => {
      const index = rows.findIndex((r) => r.userId === userId && r.itemId === itemId);
      if (index < 0) return 0;
      rows.splice(index, 1);
      return 1;
    },
  };
  return { rows, store };
}

const now = new Date("2026-11-18T08:00:00Z");

test("item state: dismiss/snooze yalnız oturumdaki kullanıcının kaydını yazar", async () => {
  const { rows, store } = memoryStore();
  await dismissItem(store, "u1", "accounting:overdue:inv1");
  await dismissItem(store, "u2", "accounting:overdue:inv1");
  await snoozeItem(store, "u1", "accounting:overdue:inv1", new Date("2026-11-20T08:00:00Z"), now);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.userId === "u1")?.state, "SNOOZED");
  assert.equal(rows.find((r) => r.userId === "u2")?.state, "DISMISSED");

  // Başka kullanıcının öğesini geri alamaz.
  assert.equal(await restoreItem(store, "u3", "accounting:overdue:inv1"), 0);
  assert.equal(rows.length, 2);
  assert.equal(await restoreItem(store, "u1", "accounting:overdue:inv1"), 1);
  assert.deepEqual(rows.map((r) => r.userId), ["u2"]);
});

test("item state: geçmiş veya çok uzak erteleme reddedilir", async () => {
  const { rows, store } = memoryStore();
  await assert.rejects(() => snoozeItem(store, "u1", "tasks:due", new Date("2026-11-18T07:59:00Z"), now), ItemStateError);
  await assert.rejects(() => snoozeItem(store, "u1", "tasks:due", now, now), /snoozeInPast/);
  await assert.rejects(() => snoozeItem(store, "u1", "tasks:due", new Date("2027-03-01T00:00:00Z"), now), /snoozeTooLong/);
  await assert.rejects(() => snoozeItem(store, "u1", "tasks:due", new Date("invalid"), now), /snoozeInPast/);
  assert.equal(rows.length, 0);
});

test("item state: şema öğe kimliği biçimini ve ISO zamanı denetler", () => {
  assert.ok(itemRefSchema.safeParse({ itemId: "members:birthday:abc_1" }).success);
  assert.ok(!itemRefSchema.safeParse({ itemId: "Members:x" }).success);
  assert.ok(!itemRefSchema.safeParse({ itemId: "x" }).success);
  assert.ok(snoozeSchema.safeParse({ itemId: "tasks:due", until: "2026-11-19T07:00:00+01:00" }).success);
  assert.ok(!snoozeSchema.safeParse({ itemId: "tasks:due", until: "yarın" }).success);
});

test("item state: audit meta içeriksizdir (kaynak kimliği yok)", () => {
  const meta = auditMeta("accounting:overdue:inv-secret", "SNOOZED", new Date("2026-11-20T08:00:00Z"));
  assert.deepEqual(meta, { module: "accounting", state: "SNOOZED", until: "2026-11-20T08:00:00.000Z" });
  assert.ok(!JSON.stringify(meta).includes("inv-secret"));
});
