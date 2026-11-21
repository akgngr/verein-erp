import "server-only";

// widgets modülü — sunucu public girişi.
import { widgetRegistry } from "@/widget-registry";
import { permissionResources } from "@/permissions-registry";
import type { Role } from "@/shared/roles";

import { visibleWidgetIds } from "./services/visibility";

export { visibleWidgetIds } from "./services/visibility";

/** Bu kullanıcı için görünür widget kimlikleri (yuva sunucuda süzer; istemciye yalnız kimlikler iner). */
export function listVisibleWidgetIds(role: Role, usableModuleKeys: readonly string[]): string[] {
  return visibleWidgetIds({ registry: widgetRegistry, usableModuleKeys, role, resources: permissionResources });
}
