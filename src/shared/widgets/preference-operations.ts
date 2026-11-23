import type { WidgetDefinition, WidgetPreference } from "./contract";

/**
 * Pure preference editor for WP4. Only trusted, server-authorized definitions
 * are editable. The persistence action must independently recheck permissions.
 */
export function editWidgetPreferences(
  definitions: readonly WidgetDefinition[],
  current: readonly WidgetPreference[],
  canView: (widget: WidgetDefinition) => boolean,
  change: { type: "toggle"; id: string; enabled: boolean } | { type: "move"; id: string; direction: -1 | 1 } | { type: "reset" },
): WidgetPreference[] {
  const allowed: WidgetDefinition[] = [];
  for (const widget of definitions) {
    try {
      if (canView(widget)) allowed.push(widget);
    } catch {
      // Authorization errors are denial, not permission to edit.
    }
  }
  const permitted = new Map(allowed.map((widget) => [widget.id, widget]));
  const seen = new Set<string>();
  const safeCurrent = current.filter((item) => {
    if (!item || typeof item.id !== "string" || typeof item.enabled !== "boolean" ||
        !Number.isSafeInteger(item.order) || seen.has(item.id) || !permitted.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const byId = new Map(safeCurrent.map((item) => [item.id, item]));
  const slots = new Map<string, WidgetDefinition[]>();
  for (const widget of allowed) {
    const group = slots.get(widget.slot) ?? [];
    group.push(widget);
    slots.set(widget.slot, group);
  }
  const ordered = [...slots.values()].flatMap((group) =>
    group.sort((a, b) => (byId.get(a.id)?.order ?? a.priority ?? 1000) -
      (byId.get(b.id)?.order ?? b.priority ?? 1000) || a.id.localeCompare(b.id)));

  if (change.type === "reset") {
    return ordered.map((widget, order) => ({
      id: widget.id, enabled: widget.mandatory || widget.defaultEnabled === true, order,
    }));
  }
  const target = permitted.get(change.id);
  if (!target) return ordered.map((widget, order) => ({
    id: widget.id, enabled: widget.mandatory || (byId.get(widget.id)?.enabled ?? widget.defaultEnabled ?? false), order,
  }));
  if (change.type === "move") {
    const from = ordered.findIndex((widget) => widget.id === change.id);
    const to = from + change.direction;
    if (to >= 0 && to < ordered.length && ordered[to].slot === target.slot) {
      [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    }
  }
  return ordered.map((widget, order) => ({
    id: widget.id,
    enabled: widget.mandatory || (change.type === "toggle" && widget.id === change.id
      ? change.enabled : (byId.get(widget.id)?.enabled ?? widget.defaultEnabled ?? false)),
    order,
  }));
}
