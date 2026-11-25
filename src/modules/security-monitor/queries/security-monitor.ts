import "server-only";

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
  const run = await getDb().securityTestRun.findUnique({ where: { id } });
  if (!run) throw new Error(`Test run not found: ${id}`); // i18n-ignore
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

// #585: Ayrı zamanlama tablosu (SecurityTestSchedule) hiçbir yere bağlı değildi; düzenli çalıştırma otomasyon
// zamanlamasıyladır (security-monitor.run_tests görevinin `schedule` tanımı). API ve servis fonksiyonları kaldırıldı;
// tablo veri kaybı olmasın diye şemada kalır.

export async function acknowledgeSecurityAlert(id: string, userId: string) {
  return getDb().securityTestAlert.update({
    where: { id },
    data: {
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
  });
}

export async function resolveSecurityAlert(id: string, userId: string) {
  return getDb().securityTestAlert.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
  });
}
