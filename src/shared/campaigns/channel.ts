import type { Recipient } from "@/shared/mailings/define";

/**
 * KAMPANYA KANALI SÖZLEŞMESİ (src/modules/<modül>/channels.ts → `export const channels = defineChannels(...)`).
 * `pnpm module:sync` src/campaign-channel-registry.ts'i üretir. Kampanyalar modülü kanal bilmez: etkin
 * modüllerin kanalları sihirbazda kendiliğinden görünür. E-posta, Kampanyalar modülünün kendi kanalıdır;
 * SMS, Telegram, WhatsApp ayrı eklenti modülleridir.
 *
 * Kurallar: alıcı adresi yoksa veya rıza yoksa kişi atlanır; mesaj içeriği ve adresler otomasyon yüküne
 * yazılmaz; `delivered` ile yeniden denemede çift gönderim önlenir.
 */
export type ChannelMessage = {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html?: string;
  /** Kampanya kimliği (gönderim kaydı referansı). */
  reference: string;
  /** Uygulamanın genel adresi; sağlayıcıya mesaj başına durum bildirimi adresi verilebiliyorsa (Twilio). */
  callbackBaseUrl?: string;
};

export type ChannelSendResult = { ok: boolean; error?: string; providerId?: string };

/** Yönetici ayarı (etiket: <modül>.channelSettings.<kanal>.<key>); `secret` olanlar şifreli saklanır ve geri gösterilmez. */
export type ChannelSetting = { key: string; secret?: boolean; options?: readonly string[]; defaultValue?: string };
/** Ayar değerleri (gizliler çözülmüş; yalnız sunucuda). */
export type ChannelConfig = Record<string, string>;

export type CampaignChannel = {
  /** Benzersiz anahtar: "email", "sms", "telegram", "whatsapp" … */
  key: string;
  /** Lucide simge adı (UI). */
  icon: "Mail" | "MessageSquare" | "Send" | "MessageCircle";
  capabilities: { subject: boolean; html: boolean; maxLength?: number };
  /** Kişinin bu kanaldaki adresi; yoksa null (atlanır). */
  address(recipient: Recipient): string | null;
  /** Gönderim izni (rıza / itiraz). */
  allowed(recipient: Recipient): boolean;
  /** Yönetici ayarları (Kampanyalar → Ayarlar). Yoksa ayar ekranında görünmez. */
  settings?: readonly ChannelSetting[];
  isConfigured(config: ChannelConfig): Promise<boolean>;
  /** Sağlayıcı panelinde girilecek bildirim (webhook) adresleri; ayar ekranında gösterilir. */
  webhookUrls?(config: ChannelConfig, origin: string): { key: string; url: string }[];
  /** Ayarlar kaydedildikten sonra (ör. Telegram webhook kaydı). `origin` = uygulamanın genel adresi. */
  setup?(config: ChannelConfig, origin: string): Promise<void>;
  sendBatch(messages: ChannelMessage[], config: ChannelConfig): Promise<ChannelSendResult[]>;
  /**
   * Bu kampanya için başarıyla gönderilmiş adresler (yeniden denemede atlanır). Verilmezse Kampanyalar
   * modülü gönderimleri kendi kaydında (mailings_deliveries) tutar.
   */
  delivered?(reference: string): Promise<string[]>;
  /**
   * Alıcıları kanala özgü veriyle zenginleştirir (ör. Telegram sohbet kimliği, telefon biçimi).
   * `sourceId` = "<modül>:<kaynak>"; alıcı anahtarı `${sourceId}:${recipient.id}`.
   */
  enrich?(list: Recipient[], config: ChannelConfig, sourceId: string): Promise<Recipient[]>;
  /**
   * Tüm kampanyalarda kullanılabilen ek yer tutucular (ör. {telegramLink}: e-postayla Telegram'a davet).
   * Anahtar → değişkenler; alıcı anahtarı `<modül>:<kaynak>:<id>`.
   */
  placeholders?: { keys: readonly string[]; values(recipientKeys: string[], config: ChannelConfig): Promise<Record<string, Record<string, string>>> };
};

export type ModuleCampaignChannels = { module: string; channels: CampaignChannel[] };

export function defineChannels(module: string, channels: CampaignChannel[]): ModuleCampaignChannels {
  return { module, channels };
}

/** Alıcı listesini kanal için ayırır: gönderilecekler ve atlanma nedenleri. */
export function splitForChannel(channel: Pick<CampaignChannel, "address" | "allowed">, list: Recipient[]) {
  const noAddress = list.filter((row) => !channel.address(row)).length;
  const optOut = list.filter((row) => channel.address(row) && !channel.allowed(row)).length;
  const eligible = list.filter((row) => channel.address(row) && channel.allowed(row));
  return { eligible, noAddress, optOut };
}

/** Telefonu E.164 biçimine getirir ("0151 …" → "+49151…"); geçersizse null. */
export function normalizePhone(value: string | null | undefined, defaultCountryCode = "49"): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) digits = `+${defaultCountryCode}${digits.slice(1)}`;
  else if (!digits.startsWith("+")) digits = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** https + host allowlist + zaman aşımı; sağlayıcı API'lerine yalnız bununla gidilir. */
export async function channelFetch(allowedHosts: readonly string[], url: string, init: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new Error("CHANNEL_HOST_NOT_ALLOWED");
  }
  return fetch(parsed, { ...init, redirect: "error", signal: AbortSignal.timeout(20_000) });
}
