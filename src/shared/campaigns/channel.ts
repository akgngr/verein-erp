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
};

export type ChannelSendResult = { ok: boolean; error?: string };

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
  isConfigured(): Promise<boolean>;
  sendBatch(messages: ChannelMessage[]): Promise<ChannelSendResult[]>;
  /** Bu kampanya için başarıyla gönderilmiş adresler (yeniden denemede atlanır). */
  delivered(reference: string): Promise<string[]>;
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
