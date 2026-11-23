import type { ModuleCategory } from "@/shared/types/module";

/**
 * Redacted error category names.
 * Ensures NO PII, user identifiers, payloads, or raw system error details leak to callers.
 */
export const REDACTED_ERROR_CATEGORIES = [
  "TIMEOUT",
  "NETWORK_ERROR",
  "AUTH_OR_PERMISSION_ERROR",
  "VALIDATION_ERROR",
  "RATE_LIMIT",
  "DATABASE_ERROR",
  "SYSTEM_ERROR",
  "UNKNOWN_ERROR",
] as const;

export type RedactedErrorCategory = (typeof REDACTED_ERROR_CATEGORIES)[number];

/**
 * Pure function: Maps raw error codes or messages to privacy-safe, redacted categories.
 */
export function redactErrorCategory(
  code?: string | null,
  message?: string | null,
): RedactedErrorCategory {
  const norm = `${code ?? ""} ${message ?? ""}`.toLowerCase();

  if (norm.includes("timeout") || norm.includes("timedout") || norm.includes("etimedout")) {
    return "TIMEOUT";
  }
  if (
    norm.includes("econnrefused") ||
    norm.includes("enotfound") ||
    norm.includes("network") ||
    norm.includes("fetch failed") ||
    norm.includes("socket")
  ) {
    return "NETWORK_ERROR";
  }
  if (
    norm.includes("unauthorized") ||
    norm.includes("forbidden") ||
    norm.includes("permission") ||
    norm.includes("access_denied") ||
    norm.includes("auth")
  ) {
    return "AUTH_OR_PERMISSION_ERROR";
  }
  if (norm.includes("validation") || norm.includes("zod") || norm.includes("invalid")) {
    return "VALIDATION_ERROR";
  }
  if (norm.includes("rate_limit") || norm.includes("429") || norm.includes("too many requests")) {
    return "RATE_LIMIT";
  }
  if (
    norm.includes("prisma") ||
    norm.includes("database") ||
    norm.includes("deadlock") ||
    norm.includes("unique constraint") ||
    norm.includes("foreign key")
  ) {
    return "DATABASE_ERROR";
  }

  // Pre-vetted safe uppercase codes
  if (code && /^[A-Z0-9_]{3,30}$/.test(code)) {
    if (code === "TASK_TIMEOUT") return "TIMEOUT";
    if (code === "TASK_CANCELLED") return "SYSTEM_ERROR";
    if (code === "RETRY_EXHAUSTED") return "SYSTEM_ERROR";
  }

  return "UNKNOWN_ERROR";
}

export type ReadinessCheckStatus = "COMPLETE" | "INCOMPLETE" | "NOT_REQUIRED";
export type AccessGrantStatus = "APPROVED" | "PENDING" | "NONE";
export type HeartbeatStatus = "HEALTHY" | "STALE" | "IDLE" | "DISABLED";
export type OverallReadinessStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface ModuleReadinessItem {
  moduleKey: string;
  moduleLabel: string;
  category: ModuleCategory;
  isActive: boolean;
  isProtected: boolean;

  configuration: {
    status: ReadinessCheckStatus;
    missingKeys: string[];
    guidanceKey?: string;
    fixHref?: string;
  };

  accessGrants: {
    status: AccessGrantStatus;
    pendingCount: number;
    guidanceKey?: string;
    fixHref?: string;
  };

  workerHeartbeat: {
    status: HeartbeatStatus;
    lastHeartbeatAt: string | null;
    activeExecutionsCount: number;
  };

  failedJobs: {
    totalFailed: number;
    categories: Record<string, number>;
    guidanceKey?: string;
    fixHref?: string;
  };

  notificationChannels?: {
    configured: boolean;
    enabledChannels: string[];
    guidanceKey?: string;
    fixHref?: string;
  };

  overallStatus: OverallReadinessStatus;
}

export interface ReadinessSummary {
  totalModules: number;
  activeModules: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  totalFailedJobs: number;
  globalWorkerStatus: "HEALTHY" | "IDLE" | "DEGRADED";
}

export interface ModuleReadinessReport {
  generatedAt: string;
  summary: ReadinessSummary;
  modules: ModuleReadinessItem[];
}

/**
 * Pure calculation: aggregates raw metadata and counts into a clean, PII-free report.
 */
export function computeModuleReadiness(input: {
  modules: Array<{
    key: string;
    label: string;
    category: ModuleCategory;
    isProtected?: boolean;
    access?: Array<{ module: string; operations: string[] }>;
  }>;
  states: Record<string, boolean>;
  accessApprovedMap: Record<string, boolean>;
  configurationMap: Record<
    string,
    { status: ReadinessCheckStatus; missingKeys: string[]; guidanceKey?: string; fixHref?: string }
  >;
  failedJobsMap: Record<string, Array<{ code?: string | null; message?: string | null }>>;
  heartbeatMap: Record<
    string,
    { lastHeartbeatAt: string | null; activeCount: number; isStale: boolean }
  >;
  notificationChannelInfo?: { configured: boolean; enabledChannels: string[] };
}): ModuleReadinessReport {
  const items: ModuleReadinessItem[] = [];
  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let totalFailedJobs = 0;

  for (const mod of input.modules) {
    const isProtected = Boolean(mod.isProtected || mod.category === "CORE");
    const isActive = isProtected ? true : (input.states[mod.key] ?? true);

    // Skip inactive optional modules from health warnings
    if (!isActive) {
      items.push({
        moduleKey: mod.key,
        moduleLabel: mod.label,
        category: mod.category,
        isActive: false,
        isProtected,
        configuration: { status: "NOT_REQUIRED", missingKeys: [] },
        accessGrants: { status: "NONE", pendingCount: 0 },
        workerHeartbeat: { status: "DISABLED", lastHeartbeatAt: null, activeExecutionsCount: 0 },
        failedJobs: { totalFailed: 0, categories: {} },
        overallStatus: "HEALTHY",
      });
      healthyCount++;
      continue;
    }

    // 1. Configuration check
    const configCheck = input.configurationMap[mod.key] ?? {
      status: "COMPLETE",
      missingKeys: [],
    };

    // 2. Access grants
    const hasAccessRequests = (mod.access?.length ?? 0) > 0;
    const isApproved = input.accessApprovedMap[mod.key] ?? false;
    const accessStatus: AccessGrantStatus = !hasAccessRequests
      ? "NONE"
      : isApproved
        ? "APPROVED"
        : "PENDING";

    const accessGrants = {
      status: accessStatus,
      pendingCount: accessStatus === "PENDING" ? (mod.access?.length ?? 0) : 0,
      guidanceKey: accessStatus === "PENDING" ? "accessGrantsPending" : undefined,
      fixHref: accessStatus === "PENDING" ? "/ayarlar/moduller" : undefined,
    };

    // 3. Worker Heartbeat
    const hb = input.heartbeatMap[mod.key] ?? {
      lastHeartbeatAt: null,
      activeCount: 0,
      isStale: false,
    };
    let heartbeatStatus: HeartbeatStatus = "IDLE";
    if (hb.activeCount > 0) {
      heartbeatStatus = hb.isStale ? "STALE" : "HEALTHY";
    } else if (hb.lastHeartbeatAt) {
      heartbeatStatus = "HEALTHY";
    }

    // 4. Failed Jobs by Redacted Category
    const rawFails = input.failedJobsMap[mod.key] ?? [];
    const categories: Record<string, number> = {};
    for (const fail of rawFails) {
      const cat = redactErrorCategory(fail.code, fail.message);
      categories[cat] = (categories[cat] ?? 0) + 1;
    }
    const failedCount = rawFails.length;
    totalFailedJobs += failedCount;

    const failedJobs = {
      totalFailed: failedCount,
      categories,
      guidanceKey: failedCount > 0 ? "failedJobsDetected" : undefined,
      fixHref: failedCount > 0 ? "/ayarlar/otomasyon" : undefined,
    };

    // 5. Special notification check for notifications module
    let notificationChannels: ModuleReadinessItem["notificationChannels"];
    if (mod.key === "notifications" && input.notificationChannelInfo) {
      notificationChannels = {
        configured: input.notificationChannelInfo.configured,
        enabledChannels: input.notificationChannelInfo.enabledChannels,
        guidanceKey: !input.notificationChannelInfo.configured
          ? "notificationsNoChannel"
          : undefined,
        fixHref: !input.notificationChannelInfo.configured ? "/ayarlar/bildirimler" : undefined,
      };
    }

    // Compute overall status
    let overallStatus: OverallReadinessStatus = "HEALTHY";
    if (failedCount > 5 || heartbeatStatus === "STALE") {
      overallStatus = "CRITICAL";
      criticalCount++;
    } else if (
      configCheck.status === "INCOMPLETE" ||
      accessStatus === "PENDING" ||
      failedCount > 0 ||
      (notificationChannels && !notificationChannels.configured)
    ) {
      overallStatus = "WARNING";
      warningCount++;
    } else {
      healthyCount++;
    }

    items.push({
      moduleKey: mod.key,
      moduleLabel: mod.label,
      category: mod.category,
      isActive: true,
      isProtected,
      configuration: configCheck,
      accessGrants,
      workerHeartbeat: {
        status: heartbeatStatus,
        lastHeartbeatAt: hb.lastHeartbeatAt,
        activeExecutionsCount: hb.activeCount,
      },
      failedJobs,
      notificationChannels,
      overallStatus,
    });
  }

  const globalWorkerStatus: ReadinessSummary["globalWorkerStatus"] =
    criticalCount > 0 ? "DEGRADED" : healthyCount > 0 ? "HEALTHY" : "IDLE";

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalModules: input.modules.length,
      activeModules: items.filter((m) => m.isActive).length,
      healthyCount,
      warningCount,
      criticalCount,
      totalFailedJobs,
      globalWorkerStatus,
    },
    modules: items,
  };
}
