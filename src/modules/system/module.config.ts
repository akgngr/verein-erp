import { Boxes, History, Settings } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";

export const moduleConfig: ModuleConfig = {
  key: "system",
  label: "Modül Yönetimi",
  description: "Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  nav: [
    {
      href: "/ayarlar",
      label: "Ayarlar",
      labelKey: "ayarlar",
      icon: Settings,
      group: "settings",
      order: 0,
      permission: { definition: settingsPermissions, action: "view" },
    },
    {
      href: "/ayarlar/moduller",
      label: "Modül Yönetimi",
      labelKey: "moduller",
      icon: Boxes,
      group: "settings",
      order: 3,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/surum-notlari",
      label: "Sürüm notları",
      labelKey: "surumNotlari",
      icon: History,
      group: "settings",
      order: 99,
      permission: { definition: settingsPermissions, action: "view" },
    },
  ],
};
