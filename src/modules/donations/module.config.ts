import { HandHeart } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { donationsPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "donations",
  label: "Bağışlar",
  description: "Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/bagislar",
      label: "Bağışlar",
      labelKey: "bagislar",
      icon: HandHeart,
      group: "main",
      order: 5,
      permission: { definition: donationsPermissions, action: "view" },
    },
  ],
};
