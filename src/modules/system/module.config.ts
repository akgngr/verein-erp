import { Boxes } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { systemPermissions } from "@/shared/permissions/system";

export const moduleConfig: ModuleConfig = {
  key: "system",
  label: "Modül Yönetimi",
  description: "Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi.",
  category: "CORE",
  isProtected: true,
  hasSchema: false,
  nav: [
    {
      href: "/ayarlar/moduller",
      label: "Modüller",
      icon: Boxes,
      group: "settings",
      order: 3,
      permission: { definition: systemPermissions, action: "view" },
    },
  ],
};
