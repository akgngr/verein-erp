import "server-only";

import { getDb } from "@/shared/db";
import { canEncryptSecrets } from "@/shared/security/secret-box";

import { evaluateRuntimeChecks, type CheckResult, type RuntimeSnapshot } from "./runtime-checks";

type SupportedTestSuite = "security";

interface TestResult {
  success: boolean;
  testSuite: SupportedTestSuite;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: CheckResult[];
  logs: string[];
  errors: string[];
}

function isSupportedTestSuite(value: string): value is SupportedTestSuite {
  return value === "security";
}

/** Veritabanı yoklamaları: salt okunur katalog sorguları (kullanıcı girdisi yok). */
async function probeDatabase(): Promise<Pick<RuntimeSnapshot, "auditTriggers" | "failedMigrations">> {
  const db = getDb();
  const triggers = await db.$queryRaw<Array<{ tgname: string }>>`
    SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'AuditLog' AND NOT t.tgisinternal`;
  const failed = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`;
  return { auditTriggers: triggers.map((row) => row.tgname), failedMigrations: Number(failed[0]?.count ?? 0) };
}

/**
 * #585: Süreç içi güvenlik/bütünlük denetimi (bkz. runtime-checks.ts) ve sonucun kaydı. `fail` sonuçlar
 * uyarı üretir; `warn` başarısız sayılmaz ama raporda görünür (`skipped` alanında sayılır).
 */
export async function runSecurityTests(options: {
  testSuite?: string;
  triggeredBy?: string;
  commitHash?: string;
  branch?: string;
} = {}): Promise<TestResult> {
  const { testSuite = "security", triggeredBy = "manual", commitHash, branch } = options;
  if (!isSupportedTestSuite(testSuite)) {
    throw new Error(`Unsupported test suite: ${testSuite}`); // i18n-ignore
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const errors: string[] = [];
  const environment = process.env.NODE_ENV || "development";
  const db = getDb();

  let results: CheckResult[];
  try {
    const probes = await probeDatabase();
    results = evaluateRuntimeChecks({
      nodeEnv: environment,
      authSecret: process.env.AUTH_SECRET,
      canEncryptSecrets: canEncryptSecrets(),
      appUrl: process.env.APP_URL,
      uploadDir: process.env.UPLOAD_DIR || "./storage/uploads",
      cwd: process.cwd(),
      ...probes,
    });
  } catch (error) {
    // Ayrıntı yalnız sunucu günlüğüne; kayıtta yalnız hata kodu.
    console.error("[security-monitor] runtime checks failed:", error instanceof Error ? error.message : error);
    errors.push("RUNTIME_CHECKS_FAILED");
    results = [];
  }

  const durationMs = Date.now() - startTime;
  const passed = results.filter((item) => item.status === "pass").length;
  const failed = results.filter((item) => item.status === "fail").length;
  const warned = results.filter((item) => item.status === "warn").length;
  const status = errors.length ? "error" : failed > 0 ? "failed" : "passed";
  logs.push(`checks=${results.length} pass=${passed} warn=${warned} fail=${failed}`);

  const testRun = await db.securityTestRun.create({
    data: {
      testSuite,
      status,
      durationMs,
      totalTests: results.length,
      passed,
      failed,
      skipped: warned,
      environment,
      nodeVersion: process.version,
      osPlatform: process.platform,
      results: results as object[],
      logs,
      triggeredBy,
      commitHash,
      branch,
    },
  });

  const failures = results.filter((item) => item.status === "fail");
  if (errors.length || failures.length) {
    const critical = errors.length > 0 || failures.some((item) => item.severity === "critical");
    await db.securityTestAlert.create({
      data: {
        severity: critical ? "critical" : "high",
        type: errors.length ? "test_error" : "test_failure",
        message: errors.length ? "RUNTIME_CHECKS_FAILED" : failures.map((item) => item.key).join(","), // i18n-ignore (machine keys; UI translates)
        description: testSuite,
        testRunId: testRun.id,
        metadata: { failedChecks: failures.map((item) => item.key) },
      },
    });
  }

  return { success: status === "passed", testSuite, totalTests: results.length, passed, failed, skipped: warned, durationMs, results, logs, errors };
}

/**
 * Get test statistics.
 */
export async function getTestStatistics() {
  const db = getDb();

  const [totalRuns, passedRuns, failedRuns, openAlerts] = await Promise.all([
    db.securityTestRun.count(),
    db.securityTestRun.count({ where: { status: "passed" } }),
    db.securityTestRun.count({ where: { status: "failed" } }),
    db.securityTestAlert.count({ where: { status: "open" } }),
  ]);

  const latestRun = await db.securityTestRun.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return {
    totalRuns,
    passedRuns,
    failedRuns,
    openAlerts,
    latestRun,
    passRate: totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0,
  };
}

/**
 * Get test history for a specific suite.
 */
export async function getTestHistory(testSuite: string, limit = 30) {
  const db = getDb();

  return db.securityTestRun.findMany({
    where: { testSuite },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      status: true,
      totalTests: true,
      passed: true,
      failed: true,
      durationMs: true,
    },
  });
}
