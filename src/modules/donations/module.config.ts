import { HandHeart } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { donationsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "donations",
  label: "Bağışlar",
  nav: [
    {
      href: "/bagislar",
      // § 9: "Bağışlar (Spenden)"
      label: "Bağışlar",
      labelKey: "bagislar",
      icon: HandHeart,
      group: "main",
      order: 5,
      permission: { definition: donationsPermissions, action: "view" },
    },
  ],
};
