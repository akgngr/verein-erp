import type { ModuleConfig } from "@/shared/types/module";

/**
 * Takvim senkron eklentisi. Yalnız sağlayıcı adaptörünü (calendar-sync.ts) getirir; hesaplar,
 * şifreli kimlik bilgileri, OAuth dönüşü ve zamanlama Takvim modülündedir. Salt okunur (dış → takvim).
 */
export const moduleConfig: ModuleConfig = {
  key: "calendar-outlook",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Outlook Takvim",
  description: "Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer).",
  category: "EXTENSION",
  hasSchema: false,
  requires: [{ module: "calendar" }],
  nav: [],
};
