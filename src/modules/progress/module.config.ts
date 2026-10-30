import { ClipboardCheck } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { progressPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "progress",
  label: "Öğrenci takibi",
  description: "Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu.",
  category: "OFFICIAL",
  hasSchema: true,
  nav: [
    {
      href: "/ogrenci-takibi",
      label: "Öğrenci takibi",
      labelKey: "progress",
      icon: ClipboardCheck,
      group: "main",
      order: 29,
      permission: { definition: progressPermissions, action: "view" },
    },
  ],
};
