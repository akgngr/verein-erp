import type { Prisma } from "@prisma/client";
import { getDb } from "@/shared/db";

export async function getSecurityTestRuns(options: {
  limit?: number;
  testSuite?: string;
  status?: string;
  environment?: string;
  page?: number;
} = {}) {
  const { limit = 50, testSuite, status, environment, page = 1 } = options;
  
  const db = getDb();
  
  const where: Prisma.SecurityTestRunWhereInput = {};
  if (testSuite) where.testSuite = testSuite;
  if (status) where.status = status;
  if (environment) where.environment = environment;
  
  const [runs, total] = await Promise.all([
    db.securityTestRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.securityTestRun.count({ where }),
  ]);
  
  return {
    runs,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSecurityTestRun(id: string) {
  const db = getDb();
  
  const run = await db.securityTestRun.findUnique({
    where: { id },
  });
  
  if (!run) {
    throw new Error(`Test run not found: ${id}`); // i18n-ignore
  }
  
  return run;
}

export async function getSecurityTestAlerts(options: {
  limit?: number;
  severity?: string;
  status?: string;
  page?: number;
} = {}) {
  const { limit = 50, severity, status, page = 1 } = options;
  
  const db = getDb();
  
  const where: Prisma.SecurityTestAlertWhereInput = {};
  if (severity) where.severity = severity;
  if (status) where.status = status;
  
  const [alerts, total] = await Promise.all([
    db.securityTestAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: { testRun: true },
    }),
    db.securityTestAlert.count({ where }),
  ]);
  
  return {
    alerts,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSecurityTestSchedules() {
  const db = getDb();
  
  const schedules = await db.securityTestSchedule.findMany({
    orderBy: { name: "asc" },
  });
  
  return schedules;
}

export async function createSecurityTestSchedule(schedule: {
  name: string;
  testSuite: string;
  cronExpression: string;
  enabled?: boolean;
  timeoutMs?: number;
  retryCount?: number;
}) {
  const db = getDb();
  
  const newSchedule = await db.securityTestSchedule.create({
    data: {
      name: schedule.name,
      testSuite: schedule.testSuite,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled ?? true,
      timeoutMs: schedule.timeoutMs ?? 300000,
      retryCount: schedule.retryCount ?? 3,
    },
  });
  
  return newSchedule;
}

export async function updateSecurityTestSchedule(
  id: string,
  updates: {
    name?: string;
    testSuite?: string;
    cronExpression?: string;
    enabled?: boolean;
    timeoutMs?: number;
    retryCount?: number;
  }
) {
  const db = getDb();
  
  const updatedSchedule = await db.securityTestSchedule.update({
    where: { id },
    data: updates,
  });
  
  return updatedSchedule;
}

export async function deleteSecurityTestSchedule(id: string) {
  const db = getDb();
  
  await db.securityTestSchedule.delete({
    where: { id },
  });
}

export async function acknowledgeSecurityAlert(id: string, userId: string) {
  const db = getDb();
  
  const alert = await db.securityTestAlert.update({
    where: { id },
    data: {
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
  });
  
  return alert;
}

export async function resolveSecurityAlert(id: string, userId: string) {
  const db = getDb();
  
  const alert = await db.securityTestAlert.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
  });
  
  return alert;
}
