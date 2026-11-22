import "server-only";

import { listAccountOptions } from "@/modules/accounting/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { countUsersByRole } from "@/modules/users/server";
import { allModules } from "@/registry";
import { getDb } from "@/shared/db";
import { isAccessApproved } from "@/shared/modules/module-access";

import { getAccessRecords } from "./module-access-store";
import { getEffectiveModuleStates } from "./module-state-store";
import {
  computeModuleReadiness,
  type ModuleReadinessReport,
  type ReadinessCheckStatus,
} from "./readiness-core";

export * from "./readiness-core";

/**
 * Database query loader: loads live states and delegates to pure computation.
 */
export async function getModuleReadinessReport(): Promise<ModuleReadinessReport> {
  const db = getDb();
  const states = await getEffectiveModuleStates();
  const records = await getAccessRecords();

  const accessApprovedMap: Record<string, boolean> = {};
  for (const mod of allModules) {
    accessApprovedMap[mod.key] = isAccessApproved(mod, records[mod.key]);
  }

  // 1. Module configuration completeness checks via official module server APIs
  const configurationMap: Record<
    string,
    { status: ReadinessCheckStatus; missingKeys: string[]; guidanceKey?: string; fixHref?: string }
  > = {};

  try {
    // Accounting check via accounting public server API
    const accounts = await listAccountOptions();
    if (!accounts || accounts.length === 0) {
      configurationMap["accounting"] = {
        status: "INCOMPLETE",
        missingKeys: ["accountingAccount"],
        guidanceKey: "accountingMissingAccount",
        fixHref: "/muhasebe/ayarlar",
      };
    } else {
      configurationMap["accounting"] = { status: "COMPLETE", missingKeys: [] };
    }
  } catch {
    configurationMap["accounting"] = { status: "COMPLETE", missingKeys: [] };
  }

  try {
    // Organization profile check via organization public server API
    const org = await getOrganizationProfile();
    if (!org || !org.name?.trim()) {
      configurationMap["organization"] = {
        status: "INCOMPLETE",
        missingKeys: ["organizationProfile"],
        guidanceKey: "organizationMissingProfile",
        fixHref: "/ayarlar/kurum",
      };
    } else {
      configurationMap["organization"] = { status: "COMPLETE", missingKeys: [] };
    }
  } catch {
    configurationMap["organization"] = { status: "COMPLETE", missingKeys: [] };
  }

  try {
    // Auth user check via users public server API
    const roleCounts = await countUsersByRole();
    const totalUsers = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
    if (totalUsers === 0) {
      configurationMap["auth"] = {
        status: "INCOMPLETE",
        missingKeys: ["user"],
        guidanceKey: "authNoUsers",
        fixHref: "/ayarlar/kullanicilar",
      };
    } else {
      configurationMap["auth"] = { status: "COMPLETE", missingKeys: [] };
    }
  } catch {
    configurationMap["auth"] = { status: "COMPLETE", missingKeys: [] };
  }

  // 2. Notification channel configuration via read-only SQL
  let notificationChannelInfo: { configured: boolean; enabledChannels: string[] } | undefined;
  try {
    const channels = await db.$queryRaw<Array<{ channel: string }>>`
      SELECT channel FROM notification_channel_configs WHERE enabled = true
    `;
    const enabledChannels = channels.map((c) => c.channel);
    notificationChannelInfo = {
      configured: enabledChannels.length > 0,
      enabledChannels,
    };
  } catch {
    notificationChannelInfo = { configured: true, enabledChannels: [] };
  }

  // 3. Failed queue executions via read-only SQL
  const failedJobsMap: Record<string, Array<{ code?: string | null; message?: string | null }>> =
    {};
  const heartbeatMap: Record<
    string,
    { lastHeartbeatAt: string | null; activeCount: number; isStale: boolean }
  > = {};

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const executions = await db.$queryRaw<
      Array<{
        sourceModule: string;
        status: string;
        lastErrorCode: string | null;
        heartbeatAt: Date | null;
        updatedAt: Date;
      }>
    >`
      SELECT "sourceModule", status, "lastErrorCode", "heartbeatAt", "updatedAt"
      FROM "AutomationExecution"
      WHERE status IN ('FAILED', 'RUNNING')
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;

    for (const exec of executions) {
      const mod = exec.sourceModule;
      if (exec.status === "FAILED") {
        if (!failedJobsMap[mod]) failedJobsMap[mod] = [];
        failedJobsMap[mod].push({ code: exec.lastErrorCode });
      } else if (exec.status === "RUNNING") {
        if (!heartbeatMap[mod]) {
          heartbeatMap[mod] = { lastHeartbeatAt: null, activeCount: 0, isStale: false };
        }
        heartbeatMap[mod].activeCount++;
        const hbTime = exec.heartbeatAt ? new Date(exec.heartbeatAt) : new Date(exec.updatedAt);
        if (
          !heartbeatMap[mod].lastHeartbeatAt ||
          hbTime > new Date(heartbeatMap[mod].lastHeartbeatAt!)
        ) {
          heartbeatMap[mod].lastHeartbeatAt = hbTime.toISOString();
        }
        if (hbTime < fiveMinutesAgo) {
          heartbeatMap[mod].isStale = true;
        }
      }
    }
  } catch {
    // Automation tables may be empty in new setups
  }

  return computeModuleReadiness({
    modules: allModules.map((m) => ({
      key: m.key,
      label: m.label,
      category: m.category,
      isProtected: m.isProtected,
      access: m.access?.map((a) => ({ module: a.module, operations: a.operations })),
    })),
    states,
    accessApprovedMap,
    configurationMap,
    failedJobsMap,
    heartbeatMap,
    notificationChannelInfo,
  });
}
