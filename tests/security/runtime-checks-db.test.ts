import assert from "node:assert/strict";
import test from "node:test";

import { getDb } from "@/shared/db";

// #585: Denetim süreç içinde çalışır ve sonucu kaydeder (veritabanı gerektirir).
const enabled = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

test("runtime security checks run in-process and record a run", { skip: !enabled }, async () => {
  const { runSecurityTests } = await import("@/modules/security-monitor/services/test-runner");
  const db = getDb();
  const result = await runSecurityTests({ triggeredBy: "test" });
  try {
    assert.equal(result.errors.length, 0, "probes ran without subprocesses");
    assert.ok(result.totalTests >= 7);
    const audit = result.results.find((item) => item.key === "auditAppendOnly");
    assert.equal(audit?.status, "pass", "AuditLog append-only triggers exist in this database");
  } finally {
    const runs = await db.securityTestRun.findMany({ where: { triggeredBy: "test" }, select: { id: true } });
    await db.securityTestAlert.deleteMany({ where: { testRunId: { in: runs.map((run) => run.id) } } });
    await db.securityTestRun.deleteMany({ where: { id: { in: runs.map((run) => run.id) } } });
  }
});
