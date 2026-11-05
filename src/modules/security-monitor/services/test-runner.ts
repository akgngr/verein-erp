import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDb } from "@/shared/db";

const execFileAsync = promisify(execFile);
const SUPPORTED_TEST_SUITES = ["security", "all"] as const;
type SupportedTestSuite = (typeof SUPPORTED_TEST_SUITES)[number];

interface TestResult {
  success: boolean;
  testSuite: SupportedTestSuite;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: unknown[];
  logs: string[];
  errors: string[];
}

function isSupportedTestSuite(value: string): value is SupportedTestSuite {
  return SUPPORTED_TEST_SUITES.includes(value as SupportedTestSuite);
}

function hasStatus(value: unknown, status: string): boolean {
  return typeof value === "object" && value !== null && "status" in value && value.status === status;
}

/**
 * Run security tests and store results.
 * Only predefined package scripts are executable; user input is never passed to a shell.
 */
export async function runSecurityTests(options: {
  testSuite?: string;
  triggeredBy?: string;
  commitHash?: string;
  branch?: string;
} = {}): Promise<TestResult> {
  const {
    testSuite = "security",
    triggeredBy = "manual",
    commitHash,
    branch,
  } = options;

  if (!isSupportedTestSuite(testSuite)) {
    throw new Error(`Unsupported test suite: ${testSuite}`);
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const errors: string[] = [];
  const environment = process.env.NODE_ENV || "development";
  const nodeVersion = process.version;
  const osPlatform = process.platform;

  try {
    logs.push(`Starting ${testSuite} tests at ${new Date().toISOString()}`);

    // execFile does not invoke a shell, and the command is selected from a fixed allowlist.
    const testPattern = testSuite === "all" ? "tests/**/*.test.ts" : "tests/security/*.test.ts";
    logs.push(`Running test suite: ${testSuite}`);

    const { stdout, stderr } = await execFileAsync(
      "pnpm",
      ["exec", "tsx", "--test", "--test-reporter=json", testPattern],
      {
      cwd: process.cwd(),
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        NODE_OPTIONS: "--conditions=react-server",
      },
    });

    const durationMs = Date.now() - startTime;
    let results: unknown[] = [];
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      if (stdout.trim()) {
        const parsed: unknown = JSON.parse(stdout);
        if (typeof parsed === "object" && parsed !== null) {
          const report = parsed as {
            tests?: unknown[];
            stats?: { tests?: number; pass?: number; fail?: number; skipped?: number };
          };
          results = Array.isArray(report.tests) ? report.tests : [];
          totalTests = report.stats?.tests ?? results.length;
          passed = report.stats?.pass ?? results.filter((result) => hasStatus(result, "passed")).length;
          failed = report.stats?.fail ?? results.filter((result) => hasStatus(result, "failed")).length;
          skipped = report.stats?.skipped ?? results.filter((result) => hasStatus(result, "skipped")).length;
        }
      }
    } catch (error) {
      logs.push(`Failed to parse test results: ${String(error)}`);
    }

    if (stderr) logs.push(`Test stderr: ${stderr}`);
    const status = failed > 0 ? "failed" : totalTests > 0 ? "passed" : "error";

    const db = getDb();
    const testRun = await db.securityTestRun.create({
      data: {
        testSuite,
        status,
        durationMs,
        totalTests,
        passed,
        failed,
        skipped,
        environment,
        nodeVersion,
        osPlatform,
        results: results as object[],
        logs,
        triggeredBy,
        commitHash,
        branch,
      },
    });

    if (failed > 0) {
      await db.securityTestAlert.create({
        data: {
          severity: "high",
          type: "test_failure",
          message: `${failed} security tests failed`,
          description: `Security test suite "${testSuite}" has ${failed} failures`,
          testRunId: testRun.id,
          metadata: {
            failedTests: results.filter((result) => hasStatus(result, "failed")) as object[],
          },
        },
      });
    }

    logs.push(`Test run completed in ${durationMs}ms with status: ${status}`);

    return {
      success: status === "passed",
      testSuite,
      totalTests,
      passed,
      failed,
      skipped,
      durationMs,
      results,
      logs,
      errors,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const failure = error instanceof Error ? error : new Error(String(error));
    const processFailure = error as { stdout?: unknown; stderr?: unknown };

    errors.push(failure.message);
    if (typeof processFailure.stdout === "string") errors.push(processFailure.stdout);
    if (typeof processFailure.stderr === "string") errors.push(processFailure.stderr);

    const db = getDb();
    const testRun = await db.securityTestRun.create({
      data: {
        testSuite,
        status: "error",
        durationMs,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        environment,
        nodeVersion,
        osPlatform,
        results: [],
        logs,
        triggeredBy,
        commitHash,
        branch,
      },
    });

    await db.securityTestAlert.create({
      data: {
        severity: "critical",
        type: "test_error",
        message: `Security test execution failed: ${failure.message}`,
        description: `Failed to run test suite: ${testSuite}`,
        testRunId: testRun.id,
        metadata: { error: failure.message },
      },
    });

    return {
      success: false,
      testSuite,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs,
      results: [],
      logs,
      errors,
    };
  }
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
