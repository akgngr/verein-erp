import type { WidgetPreference, WidgetSlot } from "@/shared/widgets/contract";
import type { WidgetRegistration } from "@/shared/widgets/registry";

/**
 * WP3 (#437) — pure preference/policy rules (no DB, testable).
 * Precedence (server-authoritative): module usable + required permissions (visibility) → admin policy
 * (optional widgets may be disabled for everyone) → user preference (enable/disable optional, reorder).
 * Mandatory widgets are always enabled and cannot be disabled by policy or preference.
 */
export const MAX_PREFERENCES = 100;
export const MAX_ORDER = 999;

export type WidgetPreferenceInput = { id: unknown; enabled: unknown; order: unknown };
export type WidgetPolicyRow = { widgetId: string; disabled: boolean };

/** Keeps only known widget IDs with valid values; first occurrence wins; mandatory forced on. */
export function sanitizePreferences(input: readonly WidgetPreferenceInput[], registry: readonly WidgetRegistration[]): WidgetPreference[] {
  const byId = new Map(registry.map(({ definition }) => [definition.id, definition]));
  const seen = new Set<string>();
  const out: WidgetPreference[] = [];
  for (const item of input.slice(0, MAX_PREFERENCES)) {
    if (typeof item.id !== "string" || seen.has(item.id)) continue;
    const definition = byId.get(item.id);
    if (!definition || typeof item.enabled !== "boolean") continue;
    if (typeof item.order !== "number" || !Number.isSafeInteger(item.order) || item.order < 0 || item.order > MAX_ORDER) continue;
    seen.add(item.id);
    out.push({ id: item.id, enabled: definition.mandatory ? true : item.enabled, order: item.order });
  }
  return out;
}

/** Widget IDs the user may see after admin policy (mandatory widgets ignore policy). */
export function allowedAfterPolicy(visibleIds: readonly string[], policies: readonly WidgetPolicyRow[], registry: readonly WidgetRegistration[]): string[] {
  const disabled = new Set(policies.filter((row) => row.disabled).map((row) => row.widgetId));
  const mandatory = new Set(registry.filter(({ definition }) => definition.mandatory).map(({ definition }) => definition.id));
  return visibleIds.filter((id) => mandatory.has(id) || !disabled.has(id));
}

/** Typed contract for the settings UI (WP4 #438): one row per widget the user may see or that policy hid. */
export type WidgetSettingsRow = {
  id: string;
  moduleId: string;
  slot: WidgetSlot;
  titleKey: string;
  mandatory: boolean;
  /** Disabled for everyone by an admin (row is shown read-only so the user understands why). */
  adminDisabled: boolean;
  enabled: boolean;
  order: number;
  defaultEnabled: boolean;
  defaultOrder: number;
};

export function buildSettingsRows(input: {
  registry: readonly WidgetRegistration[];
  visibleIds: readonly string[];
  policies: readonly WidgetPolicyRow[];
  preferences: readonly WidgetPreference[];
}): WidgetSettingsRow[] {
  const visible = new Set(input.visibleIds);
  const allowed = new Set(allowedAfterPolicy(input.visibleIds, input.policies, input.registry));
  const prefs = new Map(input.preferences.map((pref) => [pref.id, pref]));
  return input.registry
    .filter(({ definition }) => visible.has(definition.id))
    .map(({ definition }) => {
      const pref = prefs.get(definition.id);
      const adminDisabled = !allowed.has(definition.id);
      return {
        id: definition.id,
        moduleId: definition.moduleId,
        slot: definition.slot,
        titleKey: definition.titleKey,
        mandatory: definition.mandatory === true,
        adminDisabled,
        enabled: !adminDisabled && (definition.mandatory === true || (pref?.enabled ?? definition.defaultEnabled ?? false)),
        order: pref?.order ?? definition.priority ?? 1000,
        defaultEnabled: definition.mandatory === true || (definition.defaultEnabled ?? false),
        defaultOrder: definition.priority ?? 1000,
      };
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
