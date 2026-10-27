import { Wallet } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { accountingPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "accounting",
  label: "Muhasebe",
  nav: [
    {
      href: "/muhasebe",
      // § 6: "Muhasebe (Buchhaltung)" — labelKey i18n üzerinden çevrilir.
      label: "Muhasebe",
      labelKey: "muhasebe",
      icon: Wallet,
      group: "main",
      order: 4,
      permission: { definition: accountingPermissions, action: "view" },
    },
  ],
};
