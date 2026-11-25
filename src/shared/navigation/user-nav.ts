import type { ModuleConfig, NavItem } from "../types/module";
import type { ModuleNavDefault } from "./nav-defaults.generated";

export type NavCategoryGroup = {
  id: string;
  label: string;
  order: number;
  icon?: string;
  collapsedByDefault?: boolean;
  isCustom?: boolean;
};

export type NavItemOverride = {
  categoryId?: string;
  parentModule?: string | null;
  order?: number;
  hidden?: boolean;
};

export type UserNavConfig = {
  groups?: NavCategoryGroup[];
  items?: Record<string, NavItemOverride>;
  collapsedGroupIds?: string[];
};

export type ResolvedNavNode = {
  moduleKey: string;
  item: NavItem;
  categoryId: string | null;
  parentModule: string | null;
  order: number;
  hidden: boolean;
  children: ResolvedNavNode[];
};

export type ResolvedNavCategory = {
  id: string;
  label: string;
  order: number;
  icon?: string;
  isCustom: boolean;
  collapsedByDefault: boolean;
  nodes: ResolvedNavNode[];
};

export type ResolvedMainMenuEntry =
  | { kind: "module"; order: number; node: ResolvedNavNode }
  | { kind: "category"; order: number; category: ResolvedNavCategory };

export function resolveModuleKeyForNavItem(
  item: NavItem,
  modules: readonly ModuleConfig[],
): string {
  const found = modules.find((mod) => mod.nav.some((n) => n.href === item.href));
  return found?.key ?? (item.href === "/" ? "_panel" : item.href);
}

/**
 * Kullanıcı bazlı sol menü ağacını üretir:
 * - Girdi `items` zaten aktif modül + rol yetkisi filtresinden geçmiş olmalıdır (yetki aşımı imkânsız).
 * - Varsayılan kategori zorlaması yoktur; yalnızca kullanıcının oluşturduğu özel gruplar (`userConfig.groups`) kullanılır.
 * - Özel gruplar ve ana modüller `order` alanına göre tek birleşik listede (`mainMenuEntries`) sıralanır.
 * - Alt modül ilişkileri (`parentModule`) varsayılan `nav.json` veya kullanıcı tercihi üzerinden gelir ve üst modülün alt menüsünde açılır.
 * - Üst modül gizli/yoksa veya döngü oluşuyorsa alt modül güvenli biçimde ana listeye çıkar.
 */
export function resolveUserSidebarTree(input: {
  items: readonly NavItem[];
  modules: readonly ModuleConfig[];
  defaults: Record<string, ModuleNavDefault>;
  userConfig?: UserNavConfig | null;
}): {
  mainMenuEntries: ResolvedMainMenuEntry[];
  uncategorizedNodes: ResolvedNavNode[];
  categories: ResolvedNavCategory[];
  childrenByParent: Record<string, ResolvedNavNode[]>;
  allItems: ResolvedNavNode[];
  pinnedTop: NavItem[];
} {
  const { items, modules, defaults, userConfig } = input;
  const itemOverrides = userConfig?.items ?? {};

  const pinnedTop: NavItem[] = [];
  const rawNodes: ResolvedNavNode[] = [];

  for (const item of items) {
    if (item.href === "/") {
      pinnedTop.push(item);
      continue;
    }

    const moduleKey = resolveModuleKeyForNavItem(item, modules);
    const def = defaults[moduleKey];
    const ov = itemOverrides[moduleKey];

    const categoryId = ov && "categoryId" in ov ? (ov.categoryId ?? null) : null;
    const parentModule =
      ov && "parentModule" in ov
        ? (ov.parentModule ?? null)
        : (item.parentModule ?? def?.parentModule ?? null);
    const order = typeof ov?.order === "number" ? ov.order : item.order;
    const hidden = Boolean(ov?.hidden);

    rawNodes.push({
      moduleKey,
      item,
      categoryId,
      parentModule: parentModule === moduleKey ? null : parentModule,
      order,
      hidden,
      children: [],
    });
  }

  rawNodes.sort((a, b) => a.order - b.order || a.moduleKey.localeCompare(b.moduleKey));

  // Kategori haritası: yalnızca kullanıcının oluşturduğu özel gruplar
  const categoryMap = new Map<string, ResolvedNavCategory>();
  for (const customGroup of userConfig?.groups ?? []) {
    categoryMap.set(customGroup.id, {
      id: customGroup.id,
      label: customGroup.label,
      order: customGroup.order,
      icon: customGroup.icon,
      isCustom: true,
      collapsedByDefault: Boolean(customGroup.collapsedByDefault),
      nodes: [],
    });
  }

  // Görünür düğümlerin üst-alt modül ağacını kur (döngü korumalı)
  const visibleMap = new Map<string, ResolvedNavNode>();
  for (const node of rawNodes) {
    if (!node.hidden) {
      visibleMap.set(node.moduleKey, { ...node, children: [] });
    }
  }

  const wouldCreateCycle = (childKey: string, parentKey: string): boolean => {
    let cur: string | null = parentKey;
    const seen = new Set<string>([childKey]);
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      cur = visibleMap.get(cur)?.parentModule ?? null;
    }
    return false;
  };

  const rootNodes: ResolvedNavNode[] = [];
  const childrenByParent: Record<string, ResolvedNavNode[]> = {};
  for (const node of visibleMap.values()) {
    const parent = node.parentModule ? visibleMap.get(node.parentModule) : undefined;
    if (parent && !wouldCreateCycle(node.moduleKey, parent.moduleKey)) {
      node.categoryId = parent.categoryId;
      parent.children.push(node);
      (childrenByParent[parent.moduleKey] ??= []).push(node);
    } else {
      rootNodes.push(node);
    }
  }

  const uncategorizedNodes: ResolvedNavNode[] = [];
  for (const node of rootNodes) {
    const cat = node.categoryId ? categoryMap.get(node.categoryId) : undefined;
    if (cat) {
      cat.nodes.push(node);
    } else {
      node.categoryId = null;
      uncategorizedNodes.push(node);
    }
  }

  const categories = Array.from(categoryMap.values())
    .filter((c) => c.nodes.length > 0 || c.isCustom)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  const mainMenuEntries: ResolvedMainMenuEntry[] = [
    ...uncategorizedNodes.map((node) => ({ kind: "module" as const, order: node.order, node })),
    ...categories.map((category) => ({ kind: "category" as const, order: category.order, category })),
  ].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.kind !== b.kind) return a.kind === "module" ? -1 : 1;
    const aKey = a.kind === "module" ? a.node.moduleKey : a.category.id;
    const bKey = b.kind === "module" ? b.node.moduleKey : b.category.id;
    return aKey.localeCompare(bKey);
  });

  return {
    mainMenuEntries,
    uncategorizedNodes,
    categories,
    childrenByParent,
    allItems: rawNodes,
    pinnedTop,
  };
}
