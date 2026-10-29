import { Building2 } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { organizationPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "organization",
  label: "Dernek Bilgileri",
  description: "Dernek ana verileri, resmi iletişim ve antet logosu.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
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
