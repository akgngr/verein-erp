import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { can } from "@/shared/permissions/define";

import { securityMonitorPermissions } from "./permissions";
import { SecurityMonitorView } from "./ui";

/**
 * Thin route entry point; the interactive UI lives in components/.
 * #582: Sayfa sunucuda yetki ister (yalnız API rotaları değil); "Testleri çalıştır" yalnız `create` iznine açıktır.
 */
export default async function SecurityMonitorPage() {
  let user;
  try {
    user = await requirePermission(securityMonitorPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  return <SecurityMonitorView canRun={can(user.role, securityMonitorPermissions, "create")} />;
}
