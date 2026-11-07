import { HandCoins } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { grantsPermissions } from "./permissions";

/**
 * Hibeler (Zuwendungen): finansman planı, ödemeler ve Verwendungsnachweis. Harcamalar muhasebedeki bağlı
 * projeden okunur; plan/gerçekleşen, sapma ve belge listesi otomatik çıkar.
 */
export const moduleConfig: ModuleConfig = {
  key: "grants",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Hibeler",
  description: "Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu).",
  category: "OFFICIAL",
  hasSchema: true,
  requires: [{ module: "accounting" }],
  basePath: "/hibeler",
  access: [{ module: "accounting", operations: ["read"] }, { module: "organization", operations: ["read"] }],
  nav: [
    {
      href: "/hibeler",
      label: "Hibeler",
      labelKey: "grants",
      icon: HandCoins,
      group: "main",
      order: 6,
      permission: { definition: grantsPermissions, action: "view" },
    },
  ],
};
