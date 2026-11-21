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
  version: "0.12.1",
  label: "Sekreter",
  description: "Kişisel sekreter: sabah özeti ve onaylı öneriler.",
  category: "EXTENSION",
  hasSchema: true,
  access: [
    { module: "notifications", operations: ["write"] }, // N1c: merkezi bildirim (ADR 0006)
    { module: "system", operations: ["read"] }, // kullanılabilir modüller (özet süzmesi)
    { module: "users", operations: ["read"] }, // günlük özet: kullanıcı etkin mi, rolü ne
    { module: "mail", operations: ["write"] }, // günlük özet e-postası (yalnız tercih eden kullanıcıya)
    { module: "exports", operations: ["write"] }, // S5.1: haftalık kurul raporu PDF (Files üretim hattı)
    { module: "organization", operations: ["read"] }, // S5.1: rapor antedi (dernek adı, adres, logo)
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
