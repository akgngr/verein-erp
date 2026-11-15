import { Download, FileText, FolderTree } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { documentCategoriesPermissions, documentsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "documents",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.6.1",
  dependencies: { "tesseract.js": "7.0.0", "@tesseract.js-data/deu": "1.0.0", "@tesseract.js-data/tur": "1.0.0", "@tesseract.js-data/eng": "1.0.0" },
  label: "Evrak Kayıt",
  description: "Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi.",
  category: "OFFICIAL",
  // Bildirilmiş entegrasyonlar (docs/MODULE_DEVELOPMENT_GUIDE.md §8, §8e): "Muhasebeye aktar" muhasebenin sunucu
  // API'sini kullanır; görev ve AI düğmeleri yalnız o modüller kullanılabilirse gösterilir.
  recommends: ["accounting", "tasks", "ai"],
  access: [
    { module: "accounting", operations: ["read", "write"] },
    { module: "tasks", operations: ["read"] },
    { module: "ai", operations: ["read"] },
    { module: "system", operations: ["read"] },
  ],
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
