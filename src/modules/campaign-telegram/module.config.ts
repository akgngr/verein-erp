import type { ModuleConfig } from "@/shared/types/module";

/**
 * Kampanya kanal eklentisi: yalnız kanal adaptörünü (channels.ts) getirir; kampanya, alıcı, rıza ve
 * gönderim kaydı Kampanyalar (mailings) modülündedir. Sağlayıcı ayarları Kampanyalar → Ayarlar'da.
 */
export const moduleConfig: ModuleConfig = {
  key: "campaign-telegram",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "Telegram",
  description: "Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır.",
  category: "EXTENSION",
  hasSchema: true,
  requires: [{ module: "mailings" }],
  // #581: /start ve /stop rızayı kaynağın kaydına yazar (mailings `recordChannelConsent`).
  access: [{ module: "mailings", operations: ["read", "write"] }],
  nav: [],
};
