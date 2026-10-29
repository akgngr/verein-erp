import { CalendarDays, ListTodo } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { meetingsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "meetings",
  label: "Toplantılar",
  description: "Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar.",
  category: "OFFICIAL",
  hasSchema: true,
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
  menu: [
    { key: "tasks", label: "Görevler", href: "/toplantilar/gorevler", icon: ListTodo },
  ],
};
