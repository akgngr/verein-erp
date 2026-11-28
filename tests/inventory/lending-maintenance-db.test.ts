import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { ANONYMISED_BORROWER, anonymiseMemberLoans } from "@/modules/inventory/lifecycle";
import { getInventoryOperationsData, RETURNED_LOANS_SHOWN } from "@/modules/inventory/queries/lending-maintenance";
import { getDb } from "@/shared/db";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.AI_TEST_DATABASE_URL !== process.env.DATABASE_URL) throw new Error("Use an isolated database");

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

async function cleanup(tag: string) {
  const db = getDb();
  const items = await db.inventoryItem.findMany({ where: { name: { startsWith: tag } }, select: { id: true } });
  const ids = items.map((i) => i.id);
  await db.inventoryLoan.deleteMany({ where: { itemId: { in: ids } } });
  await db.inventoryMaintenance.deleteMany({ where: { itemId: { in: ids } } });
  await db.inventoryItem.deleteMany({ where: { id: { in: ids } } });
}

test("member deletion anonymises returned loans and unlinks open ones, leaving other members alone", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `inv-${randomUUID().slice(0, 8)}`;
  try {
    const item = await db.inventoryItem.create({ data: { name: `${tag} Beamer` } });
    const member = `${tag}-member`;
    const other = `${tag}-other`;
    const base = { itemId: item.id, lentAt: day("2026-10-01"), createdById: "synthetic" };
    const returned = await db.inventoryLoan.create({ data: { ...base, borrowerName: "Synthetic Person", borrowerMemberId: member, returnedAt: day("2026-10-05") } });
    const open = await db.inventoryLoan.create({ data: { ...base, borrowerName: "Synthetic Person", borrowerMemberId: member } });
    const untouched = await db.inventoryLoan.create({ data: { ...base, borrowerName: "Another Person", borrowerMemberId: other, returnedAt: day("2026-10-06") } });

    assert.deepEqual(await anonymiseMemberLoans(member), { anonymised: 1, unlinked: 1 });

    const after = new Map((await db.inventoryLoan.findMany({ where: { itemId: item.id } })).map((l) => [l.id, l]));
    assert.equal(after.get(returned.id)?.borrowerName, ANONYMISED_BORROWER);
    assert.equal(after.get(returned.id)?.borrowerMemberId, null);
    assert.equal(after.get(open.id)?.borrowerName, "Synthetic Person", "open loan keeps the name while the item is out");
    assert.equal(after.get(open.id)?.borrowerMemberId, null);
    assert.equal(after.get(untouched.id)?.borrowerName, "Another Person");
    assert.equal(after.get(untouched.id)?.borrowerMemberId, other);
  } finally {
    await cleanup(tag);
  }
});

test("open loans stay listed beyond the returned-loan history, and due inspections are found by date", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `inv-${randomUUID().slice(0, 8)}`;
  try {
    const item = await db.inventoryItem.create({ data: { name: `${tag} Zelt` } });
    await db.inventoryLoan.createMany({
      data: Array.from({ length: RETURNED_LOANS_SHOWN + 5 }, (_, i) => ({
        itemId: item.id,
        borrowerName: `Synthetic ${i}`,
        lentAt: day("2026-01-01"),
        returnedAt: day("2026-02-01"),
        createdById: "synthetic",
      })),
    });
    const open = await db.inventoryLoan.create({ data: { itemId: item.id, borrowerName: "Synthetic Open", lentAt: day("2026-03-01"), createdById: "synthetic" } });
    // An overdue item whose name sorts last must still reach the schedule.
    const overdue = await db.inventoryItem.create({ data: { name: `${tag} zzz Leiter`, nextInspectionAt: day("2026-01-15") } });
    const later = await db.inventoryItem.create({ data: { name: `${tag} aaa Kabel`, nextInspectionAt: day("2026-12-20") } });
    const farAway = await db.inventoryItem.create({ data: { name: `${tag} Bohrer`, nextInspectionAt: day("2027-06-01") } });

    const data = await getInventoryOperationsData(new Date("2026-12-01T10:00:00Z"));
    const mine = data.loans.filter((l) => l.itemId === item.id);
    assert.ok(mine.some((l) => l.id === open.id), "the open loan is listed");
    assert.equal(mine.filter((l) => l.returnedAt).length <= RETURNED_LOANS_SHOWN, true);
    assert.ok(data.items.some((i) => i.id === farAway.id), "every active item is selectable");

    const schedule = data.inspections.filter((row) => row.name.startsWith(tag));
    assert.deepEqual(schedule.map((row) => row.id), [overdue.id, later.id], "overdue first, then due soon; not-yet-due excluded");
    assert.equal(schedule[0]?.inspectionStatus, "overdue");
    assert.equal(schedule[1]?.inspectionStatus, "due_soon");
  } finally {
    await cleanup(tag);
  }
});

test("member deletion runs the module hooks; the inventory tables are classified as personal data", () => {
  const action = fs.readFileSync(path.join(process.cwd(), "src/modules/members/actions/delete-member.ts"), "utf8");
  assert.ok(action.includes("await runMemberDeletionHooks(member.id)"));
  const policy = fs.readFileSync(path.join(process.cwd(), "src/shared/data-policy.ts"), "utf8");
  assert.match(policy, /InventoryLoan: \{ owner: "inventory", category: "K1"[^\n]*sensitiveFields: \["borrowerName", "borrowerMemberId"\]/);
  assert.match(policy, /InventoryMaintenance: \{ owner: "inventory", category: "K1"[^\n]*sensitiveFields: \["inspector"\]/);
});

test.after(async () => {
  if (enabled) await getDb().$disconnect();
});
