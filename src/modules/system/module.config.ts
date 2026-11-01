import { Boxes, History, Settings, Wand2, PackageCheck } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";

export const moduleConfig: ModuleConfig = {
  key: "system",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.8.0",
  label: "Modül Yönetimi",
  description: "Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Kurulum sihirbazı muhasebe hazır ayarlarını (kategori/hesap/vergi) yazar.
  access: [{ module: "accounting", operations: ["read", "write"] }],
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
      href: "/ayarlar/moduller/paketler",
      label: "Modül paketleri",
      labelKey: "modulPaketleri",
      icon: PackageCheck,
      group: "settings",
      order: 4,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/kurulum",
      label: "Kurulum sihirbazı",
      labelKey: "kurulum",
      icon: Wand2,
      group: "settings",
      order: 1,
      permission: { definition: systemPermissions, action: "update" },
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
