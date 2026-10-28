import { Wallet } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { accountingPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "accounting",
  label: "Muhasebe",
  description: "Alman dernek mevzuatına uygun çift taraflı defter tutma, fiş ve bütçe yönetimi.",
  category: "OFFICIAL",
  hasSchema: true,
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
