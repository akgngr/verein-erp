import { Users } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { membersPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "members",
  label: "Üyeler",
  nav: [
    {
      href: "/uyeler",
      label: "Üyeler",
      icon: Users,
      group: "main",
      order: 3,
      permission: { definition: membersPermissions, action: "view" },
    },
  ],
};
