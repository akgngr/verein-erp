import { NotebookPen } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { secretaryPermissions } from "./permissions";

/**
 * Kişisel sekreter (docs/specs/PERSONAL_SECRETARY.md). EXTENSION: varsayılan kapalı.
 * Diğer modülleri import etmez; modüller `secretary.ts` ile katkı verir (T0.3).
 * label/description yedek metindir; görünen adlar messages/<dil>.json → nav.secretary, module.*.
 */
export const moduleConfig: ModuleConfig = {
  key: "secretary",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "0.5.0",
  label: "Sekreter",
  description: "Kişisel sekreter: sabah özeti ve onaylı öneriler.",
  category: "EXTENSION",
  hasSchema: true,
  access: [
    { module: "system", operations: ["read"] }, // kullanılabilir modüller (özet süzmesi)
    { module: "users", operations: ["read"] }, // günlük özet: kullanıcı etkin mi, rolü ne
  ],
  nav: [
    {
      href: "/sekreter",
      label: "Sekreter",
      labelKey: "secretary",
      icon: NotebookPen,
      group: "main",
      order: 2,
      permission: { definition: secretaryPermissions, action: "view" },
    },
  ],
};
