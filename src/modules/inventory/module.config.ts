import { Download, FolderTree, Package } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { inventoryPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "inventory",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Envanter ve Demirbaş",
  description: "Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  nav: [
    {
      href: "/inventory",
      label: "Envanter",
      labelKey: "inventory",
      icon: Package,
      group: "main",
      order: 10,
      permission: { definition: inventoryPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "categories", label: "Kategoriler", href: "/inventory/kategoriler", icon: FolderTree },
    { key: "export", label: "Excel'e aktar", href: "/api/inventory/export", icon: Download, isDownload: true },
  ],
};
