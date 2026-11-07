import type { ModuleConfig } from "@/shared/types/module";

/**
 * SEPA-Lastschrift: yetkisi olan üyelerin açık aidatları ve velilerin kurs ücretleri için pain.008 tahsilat
 * dosyası; tahsil edilince ödemeler kaynak modüllere yazılır, geri dönenler (Rücklastschrift) iptal edilir.
 */
export const moduleConfig: ModuleConfig = {
  key: "sepa",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.1",
  label: "SEPA otomatik ödeme",
  description: "Aidat ve kurs ücretleri için SEPA-Lastschrift (pain.008) tahsilatı.",
  category: "OFFICIAL",
  hasSchema: true,
  requires: [{ module: "accounting" }],
  recommends: ["members", "courses"],
  basePath: "/muhasebe/sepa",
  access: [
    { module: "accounting", operations: ["read"] },
    { module: "members", operations: ["read", "write"] },
    { module: "courses", operations: ["read", "write"] },
    { module: "students", operations: ["read"] },
    { module: "organization", operations: ["read"] },
    { module: "system", operations: ["read"] },
  ],
  // Menüde Muhasebe alt menüsünde görünür (accounting/module.config.ts → menu).
  nav: [],
};
