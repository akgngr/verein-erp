import { FlaskConical } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { demoPermissions } from "./permissions";

/**
 * Test ortamı için örnek veri. Modül etkinken Ayarlar → Demo veri sayfasında "yükle" butonu görünür;
 * modül kapatıldığında üretilen tüm kayıtlar silinir (lifecycle.ts), sistem temiz kalır.
 * Modüller kendi örnek verilerini src/modules/<modül>/demo.ts ile sağlar (src/demo-registry.ts).
 */
export const moduleConfig: ModuleConfig = {
  key: "demo",
  label: "Demo veri",
  description: "Test için kurgusal örnek veri yükler; modül kapatılınca hepsini siler.",
  category: "OFFICIAL",
  hasSchema: true,
  access: [{ module: "system", operations: ["read"] }],
  nav: [
    {
      href: "/ayarlar/demo-veri",
      label: "Demo veri",
      labelKey: "demoVeri",
      icon: FlaskConical,
      group: "settings",
      order: 90,
      permission: { definition: demoPermissions, action: "view" },
    },
  ],
};
