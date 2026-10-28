import { FileText } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { documentsPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "documents",
  label: "Evrak Kayıt",
  description: "Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi.",
  category: "OFFICIAL",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/evrak",
      label: "Evrak Kayıt",
      labelKey: "evrak",
      icon: FileText,
      group: "main",
      order: 1,
      permission: { definition: documentsPermissions, action: "view" },
    },
  ],
};
