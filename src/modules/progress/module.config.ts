import { ClipboardCheck } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { progressPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "progress",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "Öğrenci takibi",
  description: "Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  // Zorunlu: yoklama ve notlar kurs derslerine/kayıtlarına bağlıdır.
  requires: [{ module: "courses" }],
  access: [
    { module: "courses", operations: ["read"] },
    { module: "organization", operations: ["read"] },
  ],
  nav: [
    {
      href: "/ogrenci-takibi",
      label: "Öğrenci takibi",
      labelKey: "progress",
      icon: ClipboardCheck,
      group: "main",
      order: 29,
      permission: { definition: progressPermissions, action: "view" },
      // Ana menüde değil, Kurslar menüsünde gösterilir (kurslarla ilişkili; menü kalabalığı olmasın).
      hidden: true,
    },
  ],
};
