import { Building2 } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { organizationPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "organization",
  label: "Dernek Bilgileri",
  nav: [
    {
      href: "/ayarlar/dernek",
      label: "Dernek Bilgileri",
      labelKey: "organization",
      icon: Building2,
      group: "settings",
      order: 1,
      permission: { definition: organizationPermissions, action: "view" },
    },
  ],
};
