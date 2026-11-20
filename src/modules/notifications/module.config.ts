import type { ModuleConfig } from "@/shared/types/module";

/**
 * Merkezi bildirim sistemi (ADR 0006). CORE: tüm modüllerin bildirimleri tek kutuda; kanallar uygulama içi,
 * e-posta, web push, Telegram, WhatsApp, SMS. İş modüllerini import etmez; türler `notifications.ts` kaydından gelir.
 * label/description yedek metindir; görünen adlar messages/<dil>.json → notifications.module.*.
 */
export const moduleConfig: ModuleConfig = {
  key: "notifications",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "0.9.0",
  label: "Bildirimler",
  description: "Tüm modüllerin bildirimleri tek yerde; kanal tercihleri ve rızalar.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  access: [
    { module: "users", operations: ["read"] }, // alıcı etkin mi, rolü ne (gönderim ve okuma anında yetki)
    { module: "system", operations: ["read"] }, // kaynak modül açık ve onaylı mı
    { module: "mail", operations: ["write"] }, // N2a: bildirim e-postaları (genel metin + bağlantı)
  ],
  // N3a: Web Push (VAPID anahtarları DB'de şifreli, otomatik üretilir).
  dependencies: {
    "web-push": "3.6.7",
  },
  // Görünür giriş noktası sağ üstteki zil (N1b); kenar menüsünde öğe yok.
  nav: [],
};

export default moduleConfig;
