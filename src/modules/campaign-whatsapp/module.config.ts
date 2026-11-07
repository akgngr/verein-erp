import type { ModuleConfig } from "@/shared/types/module";

/**
 * Kampanya kanal eklentisi: yalnız kanal adaptörünü (channels.ts) getirir; kampanya, alıcı, rıza ve
 * gönderim kaydı Kampanyalar (mailings) modülündedir. Sağlayıcı ayarları Kampanyalar → Ayarlar'da.
 */
export const moduleConfig: ModuleConfig = {
  key: "campaign-whatsapp",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "WhatsApp",
  description: "Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider.",
  category: "EXTENSION",
  hasSchema: false,
  requires: [{ module: "mailings" }],
  // Teslim/okundu bildirimlerini kampanya gönderim kaydına yazmak için.
  access: [{ module: "mailings", operations: ["read", "write"] }],
  nav: [],
};
