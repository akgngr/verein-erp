import type { ModuleConfig } from "@/shared/types/module";

/**
 * Kampanya kanal eklentisi: yalnız kanal adaptörünü (channels.ts) getirir; kampanya, alıcı, rıza ve
 * gönderim kaydı Kampanyalar (mailings) modülündedir. Sağlayıcı ayarları Kampanyalar → Ayarlar'da.
 */
export const moduleConfig: ModuleConfig = {
  key: "campaign-sms",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "SMS",
  description: "Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider.",
  category: "EXTENSION",
  hasSchema: false,
  requires: [{ module: "mailings" }],
  nav: [],
};
