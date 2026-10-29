import { Download, HandHeart } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { donationsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "donations",
  label: "Bağışlar",
  description: "Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  nav: [
    {
      href: "/bagislar",
      label: "Bağışlar",
      labelKey: "bagislar",
      icon: HandHeart,
      group: "main",
      order: 5,
      permission: { definition: donationsPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "export", label: "Excel'e aktar", href: "/api/donations/export", icon: Download, isDownload: true },
  ],
};
