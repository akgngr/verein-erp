/** ADR 0009 / #414: drafts never run outside preview; disabled rules are reported; findings persisted with version. */
import assert from "node:assert/strict";
import test from "node:test";

import { getDb } from "@/shared/db";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: cockpit fail-safe behaviour", { skip: !enabled }, async () => {
  const { runCockpit } = await import("@/modules/compliance/services/run");
  const admin = { role: "ADMIN" as const };
  assert.deepEqual(await runCockpit(admin, { year: 2026 }), [], "all v1 rules are draft → nothing runs in production");
  const preview = await runCockpit(admin, { year: 2026, preview: true });
  assert.equal(preview.length, 5);
  assert.ok(preview.every((row) => row.mode === "preview"));
  assert.equal(await getDb().complianceFinding.count({ where: { period: 2026, ruleId: { startsWith: "gem." } } }), 0, "preview is never persisted");
  const viewer = await runCockpit({ role: "VIEWER" }, { year: 2026, preview: true });
  assert.equal(viewer.length, 0, "findings hidden without the provider permissions");
  await getDb().complianceRuleState.upsert({ where: { ruleId: "gem.timely-use-of-funds" }, create: { ruleId: "gem.timely-use-of-funds", disabled: true, reason: "test" }, update: { disabled: true, reason: "test" } });
  try {
    const rows = await runCockpit(admin, { year: 2026, preview: true });
    assert.equal(rows.find((row) => row.rule.id === "gem.timely-use-of-funds")?.mode, "disabled");
  } finally {
    await getDb().complianceRuleState.deleteMany({ where: { ruleId: "gem.timely-use-of-funds" } });
  }
});
