import { Landmark } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { bankingPermissions } from "./permissions";

/**
 * Banka bağlantısı: lisanslı PSD2 sağlayıcısı (GoCardless Bank Account Data) üzerinden hesap
 * hareketlerini salt okunur çeker ve muhasebe → Banka eşleştirmesine aktarır.
 */
export const moduleConfig: ModuleConfig = {
  key: "banking",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "Banka bağlantısı",
  description: "Banka hesaplarını lisanslı PSD2 sağlayıcısı üzerinden bağlar, hareketleri muhasebeye aktarır.",
  category: "OFFICIAL",
  hasSchema: true,
  // Zorunlu: hareketler muhasebe banka eşleştirmesine aktarılır.
  requires: [{ module: "accounting" }],
  access: [{ module: "accounting", operations: ["read", "write"] }],
  nav: [
    {
      href: "/ayarlar/banka-baglantisi",
      label: "Banka bağlantısı",
      labelKey: "bankaBaglantisi",
      icon: Landmark,
      group: "settings",
      order: 45,
      permission: { definition: bankingPermissions, action: "view" },
    },
  ],
};
