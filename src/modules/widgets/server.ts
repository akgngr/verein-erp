import "server-only";

// widgets modülü — sunucu public girişi.
import { widgetRegistry } from "@/widget-registry";
import { permissionResources } from "@/permissions-registry";
import type { Role } from "@/shared/roles";
import type { WidgetPreference } from "@/shared/widgets/contract";

import { allowedAfterPolicy, buildSettingsRows, type WidgetSettingsRow } from "./services/preferences";
import { loadPolicies, loadUserPreferences } from "./services/store";
import { visibleWidgetIds } from "./services/visibility";

export { visibleWidgetIds } from "./services/visibility";
export type { WidgetSettingsRow } from "./services/preferences";
export { saveWidgetPreferencesAction, resetWidgetPreferencesAction, setWidgetPolicyAction } from "./actions/preferences";

/** Bu kullanıcı için görünür widget kimlikleri (modül + izin; politika/tercih hariç). */
export function listVisibleWidgetIds(role: Role, usableModuleKeys: readonly string[]): string[] {
  return visibleWidgetIds({ registry: widgetRegistry, usableModuleKeys, role, resources: permissionResources });
}

/**
 * Yuva için (WP2 #436): `allowedIds` = görünür ∩ yönetici politikası; `preferences` = kullanıcının tercihi.
 * İstemciye yalnız kimlikler ve tercihler iner; `<WidgetSlot canView={(d) => allowed.has(d.id)} preferences={…} />`.
 */
export async function resolveWidgetsForUser(user: { id: string; role: Role }, usableModuleKeys: readonly string[]): Promise<{ allowedIds: string[]; preferences: WidgetPreference[] }> {
  const visible = listVisibleWidgetIds(user.role, usableModuleKeys);
  const [policies, preferences] = await Promise.all([loadPolicies(), loadUserPreferences(user.id)]);
  return { allowedIds: allowedAfterPolicy(visible, policies, widgetRegistry), preferences };
}

/** Ayar ekranı sözleşmesi (WP4 #438). */
export async function getWidgetSettings(user: { id: string; role: Role }, usableModuleKeys: readonly string[]): Promise<WidgetSettingsRow[]> {
  const visibleIds = listVisibleWidgetIds(user.role, usableModuleKeys);
  const [policies, preferences] = await Promise.all([loadPolicies(), loadUserPreferences(user.id)]);
  return buildSettingsRows({ registry: widgetRegistry, visibleIds, policies, preferences });
}
