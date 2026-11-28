import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import type { ModuleConfig, PermissionRequirement } from "@/shared/types/module";

import type { QuickSearchItem } from "./types";

export interface QuickSearchNavLabels {
  /** Dashboard entry title. */
  panel: string;
  /** Label of a module nav item (`nav.<labelKey>` when translated). */
  nav: (mod: ModuleConfig, item: ModuleConfig["nav"][number]) => string;
  /** Label of a module submenu item and of its parent module. */
  menu: (mod: ModuleConfig, item: NonNullable<ModuleConfig["menu"]>[number]) => string;
  module: (mod: ModuleConfig) => string;
}

/**
 * Pages the quick-search palette may offer, with the same visibility rules as the sidebar:
 * only active modules, nav items the role may open, and submenu items checked against their
 * own permission or, when they declare none, the module home's permission (sidebar fallback).
 */
export function collectQuickSearchNavItems(input: {
  modules: readonly ModuleConfig[];
  activeModuleKeys: readonly string[];
  role: Role;
  labels: QuickSearchNavLabels;
}): QuickSearchItem[] {
  const activeSet = new Set(input.activeModuleKeys);
  const seenHref = new Set<string>(["/"]);
  const items: QuickSearchItem[] = [
    {
      id: "nav:dashboard",
      kind: "page",
      moduleKey: "panel",
      title: input.labels.panel,
      href: "/",
      keywords: "dashboard panel ana sayfa startseite",
    },
  ];
  const allowed = (permission: PermissionRequirement | undefined) =>
    !permission || can(input.role, permission.definition, permission.action);

  for (const mod of input.modules) {
    if (!activeSet.has(mod.key)) continue;
    const home = mod.nav[0];
    for (const nav of mod.nav ?? []) {
      if (!allowed(nav.permission) || seenHref.has(nav.href)) continue;
      seenHref.add(nav.href);
      items.push({
        id: `nav:${mod.key}:${nav.href}`,
        kind: "page",
        moduleKey: mod.key,
        title: input.labels.nav(mod, nav),
        subtitle: mod.key,
        href: nav.href,
        keywords: `${mod.label} ${mod.key} ${nav.href}`,
      });
    }
    for (const sub of mod.menu ?? []) {
      if (sub.href.startsWith("/api/")) continue;
      if (sub.module && !activeSet.has(sub.module)) continue;
      // Sidebar rule: a submenu item without its own permission inherits the module home's.
      if (!allowed(sub.permission ?? home?.permission)) continue;
      if (seenHref.has(sub.href)) continue;
      seenHref.add(sub.href);
      const parentLabel = input.labels.module(mod);
      items.push({
        id: `menu:${mod.key}:${sub.key}`,
        kind: "page",
        moduleKey: mod.key,
        title: input.labels.menu(mod, sub),
        subtitle: parentLabel,
        href: sub.href,
        keywords: `${parentLabel} ${mod.key} ${sub.href}`,
      });
    }
  }
  return items;
}
