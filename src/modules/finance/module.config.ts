import { SlidersHorizontal, TrendingUp } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { financePermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "finance",
  version: "0.1.4",
  label: "Finans",
  description:
    "Canlı döviz kurları, piyasa göstergeleri, kur çevirici ve finansal AI asistanı.",
  category: "EXTENSION",
  hasSchema: false,
  nav: [
    {
      href: "/finance",
      label: "Finans",
      labelKey: "finance",
      icon: TrendingUp,
      group: "main",
      order: 76,
      permission: { definition: financePermissions, action: "view" },
    },
  ],
  menu: [
    {
      key: "settings",
      label: "Ayarlar",
      href: "/finance/ayarlar",
      icon: SlidersHorizontal,
      permission: { definition: financePermissions, action: "approve" },
    },
  ],
};

export { financePermissions };
