import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getDb } from "@/shared/db";
import { getCurrentUser } from "@/modules/auth/server";

const execAsync = promisify(exec);

interface TestResult {
  success: boolean;
  testSuite: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: any[];
  logs: string[];
  errors: string[];
}

/**
 * Run security tests and store results
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

  const startTime = Date.now();
  const logs: string[] = [];
  const errors: string[] = [];

  try {
    logs.push(`Starting ${testSuite} tests at ${new Date().toISOString()}`);
    
    // Get environment info
    const environment = process.env.NODE_ENV || "development";
    const nodeVersion = process.version;
    const osPlatform = process.platform;

    // Build the test command
    const testCommand = `NODE_OPTIONS="--conditions=react-server" tsx --test "tests/${testSuite}/*.test.ts" --reporter=json`;
    
    logs.push(`Running command: ${testCommand}`);
    
    // Execute tests
    const { stdout, stderr } = await execAsync(testCommand, {
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    const durationMs = Date.now() - startTime;

    // Parse test results
    let results: any[] = [];
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      if (stdout) {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          results = parsed;
          totalTests = results.length;
          passed = results.filter((r) => r.status === "passed").length;
          failed = results.filter((r) => r.status === "failed").length;
          skipped = results.filter((r) => r.status === "skipped").length;
        }
      }
    } catch (e) {
      logs.push(`Failed to parse test results: ${e}`);
    }

    if (stderr) {
      logs.push(`Test stderr: ${stderr}`);
    }

    // Determine overall status
    const status = failed > 0 ? "failed" : totalTests > 0 ? "passed" : "error";

    // Store results in database
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
        results: results,
        logs: logs,
        triggeredBy,
        commitHash,
        branch,
      },
    });

    // Create alerts for failures
    if (failed > 0) {
      await db.securityTestAlert.create({
        data: {
          severity: "high",
          type: "test_failure",
          message: `${failed} security tests failed`,
          description: `Security test suite "${testSuite}" has ${failed} failures`,
          testRunId: testRun.id,
          metadata: {
            failedTests: results.filter((r) => r.status === "failed"),
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
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    
    errors.push(errorMessage);
    if (error.stdout) errors.push(error.stdout);
    if (error.stderr) errors.push(error.stderr);

    // Store error in database
    const db = getDb();
    await db.securityTestRun.create({
      data: {
        testSuite,
        status: "error",
        durationMs,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        osPlatform: process.platform,
        results: [],
        logs: logs,
        triggeredBy,
        commitHash,
        branch,
      },
    });

    // Create critical alert
    await db.securityTestAlert.create({
      data: {
        severity: "critical",
        type: "test_error",
        message: `Security test execution failed: ${errorMessage}`,
        description: `Failed to run security test suite: ${testSuite}`,
        testRunId: "",
        metadata: { error: errorMessage },
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
 * Get test statistics
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
 * Get test history for a specific suite
 */
export async function getTestHistory(testSuite: string, limit: number = 30) {
  const db = getDb();

  const runs = await db.securityTestRun.findMany({
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

  return runs;
}
