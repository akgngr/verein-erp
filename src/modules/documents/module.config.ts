import { Download, FileText, FolderTree } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { documentCategoriesPermissions, documentsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "documents",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Evrak Kayıt",
  description: "Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi.",
  category: "OFFICIAL",
  hasSchema: true,
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
  menu: [
    { key: "categories", label: "Kategoriler", href: "/evrak/kategoriler", icon: FolderTree, permission: { definition: documentCategoriesPermissions, action: "view" } },
    { key: "export", label: "Excel'e aktar", href: "/api/documents/export", icon: Download, isDownload: true },
  ],
};
