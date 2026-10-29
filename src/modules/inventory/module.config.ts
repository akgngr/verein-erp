import { Package } from "lucide-react";
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "inventory",
  label: "Envanter ve Demirbaş",
  description: "Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi.",
  category: "EXTENSION",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory",
      icon: Package,
      group: "main",
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
};
