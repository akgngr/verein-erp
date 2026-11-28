import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

describe("Inventory — Lending History & DGUV V3 / TÜV Maintenance (#589)", () => {
  test("classifyInspectionStatus classifies none, overdue, due_soon, and ok", async () => {
    const { classifyInspectionStatus, computeNextDueDate } = await import(
      "@/modules/inventory/helpers/maintenance"
    );
    const today = new Date("2026-11-28T00:00:00Z");

    assert.equal(classifyInspectionStatus(null, today), "none");
    assert.equal(classifyInspectionStatus(new Date("2026-11-27T00:00:00Z"), today), "overdue");
    assert.equal(classifyInspectionStatus(new Date("2026-12-10T00:00:00Z"), today), "due_soon");
    assert.equal(classifyInspectionStatus(new Date("2027-03-01T00:00:00Z"), today), "ok");

    const next = computeNextDueDate(new Date("2026-11-28T00:00:00Z"), 12);
    assert.equal(next?.toISOString().slice(0, 10), "2027-11-28");
    assert.equal(computeNextDueDate(new Date("2026-11-28T00:00:00Z"), null), null);
  });

  test("pickEarliestInspectionDate preserves earlier deadlines across maintenance kinds", async () => {
    const { pickEarliestInspectionDate } = await import(
      "@/modules/inventory/helpers/maintenance"
    );
    const earliest = pickEarliestInspectionDate([
      {
        kind: "DGUV_V3",
        performedAt: new Date("2025-12-01T00:00:00Z"),
        nextDueAt: new Date("2026-12-01T00:00:00Z"),
      },
      {
        kind: "SERVICE",
        performedAt: new Date("2026-11-28T00:00:00Z"),
        nextDueAt: new Date("2027-06-01T00:00:00Z"),
      },
    ]);
    assert.equal(earliest?.toISOString().slice(0, 10), "2026-12-01");
  });

  test("bakim-ve-zimmet route bridge exists after module:sync", () => {
    const root = process.cwd();
    assert.ok(
      fs.existsSync(
        path.join(root, "src/app/(dashboard)/(modules)/inventory/bakim-ve-zimmet/page.tsx"),
      ),
    );
  });
});
