import { Users } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { membersPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "members",
  label: "Üyeler",
  description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/uyeler",
      label: "Üyeler",
      labelKey: "uyeler",
      icon: Users,
      group: "main",
      order: 3,
      permission: { definition: membersPermissions, action: "view" },
    },
  ],
};
