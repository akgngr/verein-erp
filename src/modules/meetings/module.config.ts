import { CalendarDays } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { meetingsPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "meetings",
  label: "Toplantılar",
  description: "Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar.",
  category: "OFFICIAL",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/toplantilar",
      label: "Toplantılar",
      labelKey: "toplantilar",
      icon: CalendarDays,
      group: "main",
      order: 2,
      permission: { definition: meetingsPermissions, action: "view" },
    },
  ],
};
