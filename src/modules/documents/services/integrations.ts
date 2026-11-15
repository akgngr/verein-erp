import "server-only";

import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { accountingPermissions } from "@/modules/accounting/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { tasksPermissions } from "@/modules/tasks/server";

/**
 * Evrak modülünün diğer modüllerle bildirilmiş entegrasyonları (module.config.ts → access/recommends).
 * Düğmeler yalnız hedef modül kullanılabilir (etkin + erişim onaylı) ve kullanıcının yetkisi varsa gösterilir.
 * AI uç noktası kendi rıza/matris/sağlayıcı kapılarını ayrıca uygular.
 */
export async function getDocumentIntegrations(role: Role): Promise<{ accounting: boolean; tasks: boolean; ai: boolean }> {
  const usable = new Set(await listUsableModuleKeys());
  return {
    accounting: usable.has("accounting") && can(role, accountingPermissions, "create"),
    tasks: usable.has("tasks") && can(role, tasksPermissions, "create"),
    ai: usable.has("ai"),
  };
}
