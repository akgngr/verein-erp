import { ScrollText } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { auditPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "audit",
  label: "Denetim Kayıtları",
  description: "Sistem işlemlerinin değiştirilemez güvenlik ve denetim logları.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  nav: [
    {
      href: "/ayarlar/denetim-kaydi",
      label: "Denetim Kaydı",
      labelKey: "denetimKaydi",
      icon: ScrollText,
      group: "settings",
      order: 2,
      permission: { definition: auditPermissions, action: "view" },
    },
  ],
};
