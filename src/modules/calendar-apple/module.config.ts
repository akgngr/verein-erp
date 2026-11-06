import type { ModuleConfig } from "@/shared/types/module";

/**
 * Takvim senkron eklentisi. Yalnız sağlayıcı adaptörünü (calendar-sync.ts) getirir; hesaplar,
 * şifreli kimlik bilgileri, OAuth dönüşü ve zamanlama Takvim modülündedir. Salt okunur (dış → takvim).
 */
export const moduleConfig: ModuleConfig = {
  key: "calendar-apple",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Apple Takvim",
  description: "iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola).",
  category: "EXTENSION",
  hasSchema: false,
  requires: [{ module: "calendar" }],
  nav: [],
};
