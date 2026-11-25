import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Building2 } from "lucide-react";

import { resolveUserSidebarTree } from "../../src/shared/navigation/user-nav";
import { MODULE_NAV_DEFAULTS } from "../../src/shared/navigation/nav-defaults.generated";
import type { ModuleConfig, NavItem } from "../../src/shared/types/module";
import { definePermissions } from "../../src/shared/permissions/define";

const dummyPerm = definePermissions("test", {
  ADMIN: ["view"],
  BOARD: [],
  SECRETARY: [],
  TREASURER: [],
  AUDITOR: [],
  TAX_ADVISOR: [],
  VIEWER: [],
});

function makeModule(key: string, href: string, order: number): ModuleConfig {
  return {
    key,
    version: "1.0.0",
    label: key,
    description: key,
    category: "OFFICIAL",
    hasSchema: false,
    nav: [
      {
        href,
        label: key,
        icon: Building2,
        group: "main",
        order,
        permission: { definition: dummyPerm, action: "view" },
      },
    ],
  };
}

describe("Per-user Sidebar Navigation Tree (nav.json + UserNavConfig)", () => {
  const modules = [
    makeModule("members", "/uyeler", 1),
    makeModule("accounting", "/muhasebe", 2),
    makeModule("donations", "/bagislar", 3),
    makeModule("weather", "/hava-durumu", 4),
  ];
  const panelItem: NavItem = {
    href: "/",
    label: "Panel",
    icon: Building2,
    group: "main",
    order: 0,
    permission: { definition: dummyPerm, action: "view" },
  };
  const items = [panelItem, ...modules.flatMap((m) => m.nav)];

  it("keeps main menu flat (no forced categories) and nests sub-modules (donations -> accounting) into childrenByParent", () => {
    const tree = resolveUserSidebarTree({
      items,
      modules,
      defaults: MODULE_NAV_DEFAULTS,
    });

    assert.equal(tree.pinnedTop.length, 1);
    assert.equal(tree.categories.length, 0);
    assert.deepEqual(
      tree.uncategorizedNodes.map((n) => n.moduleKey),
      ["members", "accounting", "weather"],
    );
    assert.deepEqual(
      (tree.childrenByParent["accounting"] ?? []).map((n) => n.moduleKey),
      ["donations"],
    );
  });

  it("applies per-user custom categories, sub-module promotion, and hiding", () => {
    const tree = resolveUserSidebarTree({
      items,
      modules,
      defaults: MODULE_NAV_DEFAULTS,
      userConfig: {
        groups: [{ id: "custom_1", label: "Dernek Özel", order: 1, icon: "building" }],
        items: {
          accounting: { order: 2 },
          members: { categoryId: "custom_1", order: 1 },
          donations: { categoryId: "custom_1", parentModule: null, order: 2 },
          weather: { hidden: true },
        },
      },
    });

    const custom = tree.categories.find((c) => c.id === "custom_1");
    assert.ok(custom);
    assert.equal(custom.icon, "building");
    assert.deepEqual(
      custom.nodes.map((n) => n.moduleKey),
      ["members", "donations"],
    );
    assert.deepEqual(
      tree.mainMenuEntries.map((e) => (e.kind === "category" ? `cat:${e.category.id}` : e.node.moduleKey)),
      ["cat:custom_1", "accounting"],
    );
    assert.equal(tree.allItems.find((i) => i.moduleKey === "weather")?.hidden, true);
  });

  it("prevents cycles and promotes children if parent is hidden", () => {
    const tree = resolveUserSidebarTree({
      items,
      modules,
      defaults: MODULE_NAV_DEFAULTS,
      userConfig: {
        items: {
          accounting: { hidden: true, parentModule: "donations" },
          donations: { parentModule: "accounting" },
        },
      },
    });

    assert.deepEqual(
      tree.uncategorizedNodes.map((n) => n.moduleKey),
      ["members", "donations", "weather"],
    );
  });
});
