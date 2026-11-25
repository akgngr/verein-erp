import "server-only";

import { listAccountOptions } from "@/modules/accounting/server";
import { getAutomationHealthByModule } from "@/modules/automation/server";
import { listEnabledNotificationChannels } from "@/modules/notifications/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { countUsersByRole } from "@/modules/users/server";
import { allModules } from "@/registry";
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

  // 2. Etkin bildirim kanalları ve 3. arka plan işleri: modüllerin public API'leri (#583). Önceden ham SQL
  //    yanlış tabloyu ("AutomationExecution") sorgulayıp hatayı yutuyordu; kokpit başarısız işleri hiç
  //    göstermiyordu. Ham SQL ayrıca DATA_POLICY'yi atlıyordu. Sorgu hatası artık yutulmaz.
  const [enabledChannels, automationHealth] = await Promise.all([listEnabledNotificationChannels(), getAutomationHealthByModule()]);
  const notificationChannelInfo = { configured: enabledChannels.length > 0, enabledChannels };
  const failedJobsMap: Record<string, Array<{ code?: string | null; message?: string | null }>> = automationHealth.failed;
  const heartbeatMap = automationHealth.running;

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
