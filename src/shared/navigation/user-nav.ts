import type { ModuleConfig, NavCategoryId, NavItem } from "../types/module";
import type { ModuleNavDefault } from "./nav-defaults.generated";

export type NavCategoryGroup = {
  id: string;
  label: string;
  order: number;
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
  categoryId: string;
  parentModule: string | null;
  order: number;
  hidden: boolean;
  children: ResolvedNavNode[];
};

export type ResolvedNavCategory = {
  id: string;
  label: string;
  order: number;
  isCustom: boolean;
  collapsedByDefault: boolean;
  nodes: ResolvedNavNode[];
};

export const DEFAULT_NAV_CATEGORY_IDS: readonly NavCategoryId[] = [
  "association",
  "finance",
  "education",
  "communication",
  "operations",
];

export const DEFAULT_NAV_CATEGORY_ORDER: Record<NavCategoryId, number> = {
  association: 10,
  finance: 20,
  education: 30,
  communication: 40,
  operations: 50,
};

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
 * - Varsayılan kategori ve alt modül ilişkileri `nav.json` (MODULE_NAV_DEFAULTS) üzerinden gelir.
 * - Kullanıcının `UserNavConfig` katmanı kategori, üst modül, sıra ve gizleme uygular.
 * - Üst modül gizli/yoksa veya döngü oluşuyorsa alt modül güvenli biçimde kategori köküne çıkar.
 */
export function resolveUserSidebarTree(input: {
  items: readonly NavItem[];
  modules: readonly ModuleConfig[];
  defaults: Record<string, ModuleNavDefault>;
  userConfig?: UserNavConfig | null;
  defaultCategoryLabels: Record<NavCategoryId, string>;
}): {
  categories: ResolvedNavCategory[];
  allItems: ResolvedNavNode[];
  pinnedTop: NavItem[];
} {
  const { items, modules, defaults, userConfig, defaultCategoryLabels } = input;
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

    const categoryId =
      ov?.categoryId ?? item.categoryGroup ?? def?.categoryGroup ?? "association";
    const parentModule =
      ov && "parentModule" in ov
        ? (ov.parentModule ?? null)
        : (item.parentModule ?? def?.parentModule ?? null);
    const order = typeof ov?.order === "number" ? ov.order : (def?.order ?? item.order);
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

  // Kategori haritası: varsayılanlar + kullanıcının özel grupları
  const categoryMap = new Map<string, ResolvedNavCategory>();
  for (const id of DEFAULT_NAV_CATEGORY_IDS) {
    categoryMap.set(id, {
      id,
      label: defaultCategoryLabels[id],
      order: DEFAULT_NAV_CATEGORY_ORDER[id],
      isCustom: false,
      collapsedByDefault: false,
      nodes: [],
    });
  }

  for (const customGroup of userConfig?.groups ?? []) {
    const existing = categoryMap.get(customGroup.id);
    if (existing) {
      existing.label = customGroup.label || existing.label;
      existing.order = customGroup.order;
      existing.collapsedByDefault = Boolean(customGroup.collapsedByDefault);
    } else {
      categoryMap.set(customGroup.id, {
        id: customGroup.id,
        label: customGroup.label,
        order: customGroup.order,
        isCustom: true,
        collapsedByDefault: Boolean(customGroup.collapsedByDefault),
        nodes: [],
      });
    }
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
  for (const node of visibleMap.values()) {
    const parent = node.parentModule ? visibleMap.get(node.parentModule) : undefined;
    if (parent && !wouldCreateCycle(node.moduleKey, parent.moduleKey)) {
      node.categoryId = parent.categoryId;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  for (const node of rootNodes) {
    const cat = categoryMap.get(node.categoryId) ?? categoryMap.get("association")!;
    cat.nodes.push(node);
  }

  const categories = Array.from(categoryMap.values())
    .filter((c) => c.nodes.length > 0 || c.isCustom)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  return { categories, allItems: rawNodes, pinnedTop };
}
