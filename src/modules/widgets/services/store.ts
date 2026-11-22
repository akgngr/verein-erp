import "server-only";

import { getDb } from "@/shared/db";
import type { WidgetPreference } from "@/shared/widgets/contract";
import type { WidgetRegistration } from "@/shared/widgets/registry";

import { MAX_PREFERENCES, sanitizePreferences, type WidgetPolicyRow, type WidgetPreferenceInput } from "./preferences";

/** WP3 (#437): persistence. Every query is scoped to the given userId; there is no cross-user read or write. */
export async function loadUserPreferences(userId: string): Promise<WidgetPreference[]> {
  const rows = await getDb().widgetUserPreference.findMany({ where: { userId }, select: { widgetId: true, enabled: true, order: true }, take: MAX_PREFERENCES });
  return rows.map((row) => ({ id: row.widgetId, enabled: row.enabled, order: row.order }));
}

/** Replaces the user's preferences with the sanitised set (unknown IDs dropped, mandatory forced on). */
export async function saveUserPreferences(userId: string, input: readonly WidgetPreferenceInput[], registry: readonly WidgetRegistration[]): Promise<WidgetPreference[]> {
  const clean = sanitizePreferences(input, registry);
  const db = getDb();
  await db.$transaction([
    db.widgetUserPreference.deleteMany({ where: { userId } }),
    ...(clean.length ? [db.widgetUserPreference.createMany({ data: clean.map((pref) => ({ userId, widgetId: pref.id, enabled: pref.enabled, order: pref.order })) })] : []),
  ]);
  return clean;
}

export async function resetUserPreferences(userId: string): Promise<void> {
  await getDb().widgetUserPreference.deleteMany({ where: { userId } });
}

export async function loadPolicies(): Promise<WidgetPolicyRow[]> {
  return getDb().widgetPolicy.findMany({ select: { widgetId: true, disabled: true } });
}

/** Admin policy; mandatory or unknown widgets are refused (returns false). */
export async function setPolicy(widgetId: string, disabled: boolean, registry: readonly WidgetRegistration[]): Promise<boolean> {
  const definition = registry.find((entry) => entry.definition.id === widgetId)?.definition;
  if (!definition || definition.mandatory) return false;
  await getDb().widgetPolicy.upsert({ where: { widgetId }, create: { widgetId, disabled }, update: { disabled } });
  return true;
}
