import { Handshake } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { sponsorsPermissions } from "./permissions";

/**
 * label/description yalnızca yedek metindir; görünen adlar messages/<dil>.json
 * içindeki nav.sponsors ve module.{label,description} anahtarlarından gelir.
 */
export const moduleConfig: ModuleConfig = {
  key: "sponsors",
  version: "1.1.0",
  label: "Sponsorlar",
  description: "Kurumsal ve bireysel sponsorluk kayıtlarının yönetimi.",
  category: "EXTENSION",
  hasSchema: true,
  nav: [
    {
      href: "/sponsors",
      label: "Sponsorlar",
      labelKey: "sponsors",
      icon: Handshake,
      group: "main",
      order: 55,
      permission: { definition: sponsorsPermissions, action: "view" },
    },
  ],
};
