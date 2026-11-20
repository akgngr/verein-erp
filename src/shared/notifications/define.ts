import type { z } from "zod";

import type { PermissionRequirement } from "../types/module";

/**
 * MERKEZİ BİLDİRİM SÖZLEŞMESİ (ADR 0006).
 * Modüller `src/modules/<modül>/notifications.ts` içinde `export const notifications = defineNotificationTypes(...)`
 * ile bildirim türlerini tanımlar; `pnpm module:sync` bunları src/notification-registry.ts içinde toplar.
 * notifications modülü hiçbir iş modülünü import etmez; yalnız bu kayıt üzerinden okur.
 *
 * Gizlilik kuralları: parametreler şifreli saklanır; metin okunurken alıcının dilinde üretilir; dış kanallara
 * (e-posta, push, Telegram, WhatsApp, SMS) yalnız genel metin + uygulama içi bağlantı gider, kişisel veri gitmez.
 */
export const NOTIFICATION_CHANNELS = ["in_app", "email", "web_push", "telegram", "whatsapp", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export const EXTERNAL_NOTIFICATION_CHANNELS = NOTIFICATION_CHANNELS.filter((channel) => channel !== "in_app");

export type NotificationSeverity = "info" | "warning" | "danger";

export type NotificationType<P = unknown> = {
  /** Modül içinde benzersiz anahtar (küçük harf, tire). Tam anahtar: "<modül>.<key>". */
  key: string;
  severity: NotificationSeverity;
  /** Kullanıcı tercih etmemişse kullanılan kanallar. in_app her zaman dahildir. */
  defaultChannels: readonly NotificationChannel[];
  /** Zorunlu tür (ör. güvenlik): uygulama içi kanal kapatılamaz. */
  mandatory?: boolean;
  /** Alıcının bu bildirimi görme yetkisi; gönderim ve okuma anında yeniden denetlenir. */
  permission: PermissionRequirement;
  /** Parametre şeması (strict). Kişisel veri en aza indirilir; değerler şifreli saklanır. */
  schema: z.ZodType<P>;
  /** Modül çeviri ad alanında başlık/gövde anahtarları: "<modül>.notifications.<...>". */
  titleKey: string;
  bodyKey?: string;
  /** Uygulama içi göreli bağlantı (kaynağın yetkili sayfası); dış adres veya sorgu parametresi yok. */
  href: (params: P) => string | null;
  /**
   * İsteğe bağlı dış kanal metni (e-posta konusu, Telegram, push). YALNIZ sayı/tarih gibi kişisel olmayan değerler;
   * ad, başlık, tutar, serbest metin yasak. Verilmezse genel metin kullanılır. Tek satır, en çok 160 karakter.
   */
  externalText?: (params: P, locale: "tr" | "de") => string;
};

/** Dış kanal metnini güvenli tek satıra indirger (kontrol karakteri yok, en çok 160). */
export function safeExternalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return text || null;
}

export type ModuleNotifications = { module: string; types: NotificationType[] };

export const defineNotificationTypes = (module: string, types: NotificationType[]): ModuleNotifications => ({ module, types });

/** Tip güvenli tür tanımı (parametre tipi şemadan). */
export const defineNotificationType = <P>(type: NotificationType<P>): NotificationType => type as unknown as NotificationType;

const TYPE_KEY = /^[a-z][a-z0-9-]{1,48}$/;

/** Uygulama içi güvenli bağlantı: "/" ile başlar; "//", şema, sorgu, parça, kodlama, ".." yok. */
export function isSafeNotificationHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length < 2 || href.length > 300) return false;
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (/[\\?#%<>\s\x00-\x1f]/.test(href)) return false;
  return !href.split("/").some((segment) => segment === "." || segment === "..");
}

/** Sözleşme denetimi (kayıt testinde ve gönderimde). Hata kodları; boş = geçerli. */
export function validateModuleNotifications(moduleKey: string, definition: ModuleNotifications): string[] {
  const errors: string[] = [];
  if (definition.module !== moduleKey) errors.push(`module mismatch: ${definition.module} != ${moduleKey}`);
  const seen = new Set<string>();
  for (const type of definition.types) {
    if (!TYPE_KEY.test(type.key)) errors.push(`invalid key: ${type.key}`);
    if (seen.has(type.key)) errors.push(`duplicate key: ${type.key}`);
    seen.add(type.key);
    if (!type.titleKey.startsWith("notifications.")) errors.push(`${type.key}: titleKey must start with "notifications."`);
    if (type.bodyKey && !type.bodyKey.startsWith("notifications.")) errors.push(`${type.key}: bodyKey must start with "notifications."`);
    for (const channel of type.defaultChannels) if (!(NOTIFICATION_CHANNELS as readonly string[]).includes(channel)) errors.push(`${type.key}: unknown channel ${channel}`);
  }
  return errors;
}

export const fullTypeKey = (moduleKey: string, typeKey: string) => `${moduleKey}.${typeKey}`;
