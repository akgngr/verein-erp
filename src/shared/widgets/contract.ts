/** Build-time trusted widget declarations. Never load component paths from stored preferences. */
export const WIDGET_SLOTS = [
  "header.left",
  "header.center",
  "header.right",
  "sidebar.top",
  "dashboard",
  "footer",
] as const;

export const WIDGET_SIZES = ["compact", "inline", "popover"] as const;
export type WidgetSlot = (typeof WIDGET_SLOTS)[number];
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export interface WidgetDefinition {
  /** Stable, namespaced identifier, e.g. notifications.bell. */
  id: string;
  moduleId: string;
  slot: WidgetSlot;
  size: WidgetSize;
  titleKey: string;
  priority?: number;
  defaultEnabled?: boolean;
  requiredPermissions?: readonly string[];
  /** True for controls that must not be user-hidden. */
  mandatory?: boolean;
}

export interface WidgetPreference {
  id: string;
  enabled: boolean;
  order: number;
}

export function defineWidgets(moduleId: string, widgets: readonly WidgetDefinition[]): readonly WidgetDefinition[] {
  if (!/^[a-z][a-z0-9-]*$/.test(moduleId)) throw new Error("Invalid widget module ID");
  const seen = new Set<string>();
  for (const widget of widgets) {
    if (widget.moduleId !== moduleId || !widget.id.startsWith(moduleId + ".") ||
      !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(widget.id)) {
      throw new Error("Invalid widget ID or module ownership");
    }
    if (!WIDGET_SLOTS.includes(widget.slot) || !WIDGET_SIZES.includes(widget.size)) {
      throw new Error("Invalid widget slot or size");
    }
    if (seen.has(widget.id)) throw new Error("Duplicate widget ID: " + widget.id);
    seen.add(widget.id);
  }
  return Object.freeze([...widgets]);
}

/** Client preferences never override permission, module or administrative gating. */
export function resolveWidgets(
  definitions: readonly WidgetDefinition[],
  slot: WidgetSlot,
  preferences: readonly WidgetPreference[],
  canView: (widget: WidgetDefinition) => boolean,
): WidgetDefinition[] {
  // Treat persisted preferences as untrusted: reject duplicate IDs and invalid sort values.
  // The server-derived canView policy remains authoritative regardless of preferences.
  const preferenceMap = new Map<string, WidgetPreference>();
  const duplicateIds = new Set<string>();
  for (const item of preferences) {
    if (item === null || typeof item !== "object" ||
      typeof item.id !== "string" || typeof item.enabled !== "boolean" ||
      !Number.isSafeInteger(item.order)) continue;
    if (preferenceMap.has(item.id)) {
      duplicateIds.add(item.id);
      preferenceMap.delete(item.id);
    } else if (!duplicateIds.has(item.id)) {
      preferenceMap.set(item.id, item);
    }
  }
  return definitions.filter((widget) => {
    if (widget.slot !== slot || !canView(widget)) return false;
    return widget.mandatory || (preferenceMap.get(widget.id)?.enabled ?? widget.defaultEnabled ?? false);
  }).sort((a, b) => {
    const orderA = preferenceMap.get(a.id)?.order ?? a.priority ?? 1000;
    const orderB = preferenceMap.get(b.id)?.order ?? b.priority ?? 1000;
    return orderA - orderB || a.id.localeCompare(b.id);
  });
}
