import { Wallet } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { accountingPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "accounting",
  label: "Muhasebe",
  description: "Alman dernek mevzuatına uygun çift taraflı defter tutma, fiş ve bütçe yönetimi.",
  category: "OFFICIAL",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/muhasebe",
      label: "Muhasebe",
      labelKey: "muhasebe",
      icon: Wallet,
      group: "main",
      order: 4,
      permission: { definition: accountingPermissions, action: "view" },
    },
  ],
};
