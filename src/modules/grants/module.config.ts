import type { ModuleConfig } from "@/shared/types/module";

/**
 * Hibeler (Zuwendungen): finansman planı, ödemeler ve Verwendungsnachweis. Harcamalar muhasebedeki bağlı
 * projeden okunur; plan/gerçekleşen, sapma ve belge listesi otomatik çıkar.
 */
export const moduleConfig: ModuleConfig = {
  key: "grants",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.1",
  label: "Hibeler",
  description: "Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu).",
  category: "OFFICIAL",
  hasSchema: true,
  requires: [{ module: "accounting" }],
  basePath: "/muhasebe/hibeler",
  access: [{ module: "accounting", operations: ["read"] }, { module: "organization", operations: ["read"] }],
  // Menüde Muhasebe alt menüsünde görünür (accounting/module.config.ts → menu).
  nav: [],
};
