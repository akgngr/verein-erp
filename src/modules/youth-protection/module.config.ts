import { ShieldCheck } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { youthProtectionPermissions } from "./permissions";

/**
 * Çocuk ve Genç Koruma (§ 72a SGB VIII) Modülü.
 *
 * label/description yalnızca yedek metindir; görünen adlar messages/<dil>.json
 * içindeki nav.youth-protection ve module.{label,description} anahtarlarından gelir.
 * Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez veya dijitalleştirilmez.
 */
export const moduleConfig: ModuleConfig = {
  key: "youth-protection",
  version: "0.1.0",
  label: "Çocuk Koruma",
  description:
    "Eğitmen ve gönüllülerin genişletilmiş adli sicil belgesi (§ 72a SGB VIII) ibraz takibi ve harç muafiyet yazısı şablonu. Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez ve dijitalleştirilmez.",
  category: "EXTENSION",
  hasSchema: true,
  nav: [
    {
      href: "/youth-protection",
      label: "Çocuk Koruma",
      labelKey: "youth-protection",
      icon: ShieldCheck,
      group: "main",
      order: 85,
      permission: { definition: youthProtectionPermissions, action: "view" },
    },
  ],
};

export { youthProtectionPermissions };
