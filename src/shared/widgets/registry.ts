import { defineWidgets, type WidgetDefinition } from "./contract";

/**
 * Widget Platform WP1 (#435, ADR 0007-widget-platform). Modules declare widgets ONLY in
 * `src/modules/<module>/widget.ts`:
 *
 *   export const widgets = defineModuleWidgets("notifications", [
 *     { id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "notifications.widget.bell",
 *       requiredPermissions: ["notifications:view"], load: () => import("./widgets/bell") },
 *   ]);
 *
 * `pnpm module:sync` collects them into the generated, build-time trusted `src/widget-registry.ts`. Loaders are
 * static imports written by the module author; nothing is ever loaded from stored preferences or user input.
 * `widget.ts` must stay client-safe (no "server-only", no data access): data is fetched by the widget itself
 * through its module's server actions, which re-check authorization.
 */
export type WidgetComponentLoader = () => Promise<{ default: import("react").ComponentType }>;

export interface WidgetRegistration {
  definition: WidgetDefinition;
  /** Trusted build-time loader from module:sync; never supplied by user preferences. */
  load: WidgetComponentLoader;
}

export type ModuleWidgetInput = Omit<WidgetDefinition, "moduleId"> & { load: WidgetComponentLoader };

/** `<resource>:<action>`, e.g. `notifications:view`. */
export const WIDGET_PERMISSION_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-zA-Z]*$/;

export function defineModuleWidgets(moduleId: string, entries: readonly ModuleWidgetInput[]): readonly WidgetRegistration[] {
  const definitions = defineWidgets(moduleId, entries.map(({ load: _load, ...rest }) => ({ ...rest, moduleId })));
  entries.forEach((entry) => {
    if (typeof entry.load !== "function") throw new Error(`Widget ${entry.id} has no loader`);
    for (const permission of entry.requiredPermissions ?? []) {
      if (!WIDGET_PERMISSION_PATTERN.test(permission)) throw new Error(`Invalid widget permission: ${permission}`);
    }
  });
  return Object.freeze(definitions.map((definition, index) => Object.freeze({ definition, load: entries[index].load })));
}

/** Cross-module validation of the generated registry (duplicate IDs, ownership). Returns error strings. */
export function validateWidgetRegistry(modules: readonly { module: string; widgets: readonly WidgetRegistration[] }[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const entry of modules) {
    for (const { definition } of entry.widgets) {
      if (definition.moduleId !== entry.module) errors.push(`${entry.module}/widget.ts declares widget for another module: ${definition.id}`);
      const previous = seen.get(definition.id);
      if (previous) errors.push(`Duplicate widget ID ${definition.id} (${previous}, ${entry.module})`);
      seen.set(definition.id, entry.module);
    }
  }
  return errors;
}

/** Flattens and freezes the generated registry; throws on validation errors (fails the build early). */
export function buildWidgetRegistry(modules: readonly { module: string; widgets: readonly WidgetRegistration[] }[]): readonly WidgetRegistration[] {
  const errors = validateWidgetRegistry(modules);
  if (errors.length) throw new Error(`Widget registry invalid:\n${errors.join("\n")}`);
  return Object.freeze(modules.flatMap((entry) => entry.widgets));
}
