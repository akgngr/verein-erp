/**
 * S5.2 (#316) — sekreter bildirim kanalı sözleşmesi (Telegram, WhatsApp, SMS).
 * Kurallar: gönderim yalnız kullanıcının doğrulanmış ve geri alınmamış rızası varsa; gövde yalnız sayılar
 * (kişisel veri yok); sağlayıcı yapılandırılmamışsa adaptör KAPALIDIR (fail-closed) ve hiçbir şey gönderilmez.
 */
export const SECRETARY_EXTERNAL_CHANNELS = ["telegram", "whatsapp", "sms"] as const;
export type SecretaryExternalChannel = (typeof SECRETARY_EXTERNAL_CHANNELS)[number];

export type SecretaryChannelMessage = {
  /** Doğrulanmış adres (sohbet kimliği / E.164 telefon); yalnız sunucuda, günlüğe yazılmaz. */
  to: string;
  /** Kısa, kişisel veri içermeyen metin. */
  text: string;
  /** İdempotensi anahtarı (sağlayıcı destekliyorsa). */
  reference: string;
};

export type SecretaryChannelAdapter = {
  key: SecretaryExternalChannel;
  /** Sağlayıcı kimliği/yapılandırması hazır mı? false iken send çağrılmaz. */
  isConfigured(): Promise<boolean>;
  send(message: SecretaryChannelMessage): Promise<{ ok: boolean; providerId?: string; errorCode?: string }>;
};

/** Yapılandırma yokken kullanılan güvenli adaptör: asla göndermez. */
export function disabledChannelAdapter(key: SecretaryExternalChannel): SecretaryChannelAdapter {
  return {
    key,
    isConfigured: async () => false,
    send: async () => ({ ok: false, errorCode: "CHANNEL_DISABLED" }),
  };
}

/** Telefonu E.164'e getirir (yalnız + ve 8–15 rakam); Telegram sohbet kimliği yalnız rakam (isteğe bağlı -). */
export function normalizeChannelAddress(channel: SecretaryExternalChannel, raw: string): string | null {
  const value = raw.trim();
  if (channel === "telegram") return /^-?\d{5,20}$/.test(value) ? value : null;
  const phone = value.replace(/[\s()./-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

/** Arayüz için maskeli adres: yalnız son 3 karakter. */
export function maskChannelAddress(address: string): string {
  return address.length <= 3 ? "***" : `${"•".repeat(Math.min(8, address.length - 3))}${address.slice(-3)}`;
}
