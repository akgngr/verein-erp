import "server-only";

import type { ChannelSendResult } from "@/shared/campaigns/channel";

import { availableChannels, getChannelConfig } from "./campaigns";

/** Tek kişiye işlem mesajı gönderilebilecek, yapılandırılmış kanallar (ör. form bağlantısı). */
export async function listDirectChannels(): Promise<string[]> {
  const out: string[] = [];
  for (const channel of await availableChannels()) {
    if (await channel.isConfigured(await getChannelConfig(channel.key))) out.push(channel.key);
  }
  return out;
}

/**
 * Tek alıcıya işlem mesajı (pazarlama değil; kampanya kaydı tutulmaz). Kanal yoksa/yapılandırılmamışsa
 * gönderilmez. İçerik kaydedilmez.
 */
export async function sendDirectMessage(channelKey: string, message: { to: string; toName: string; subject: string; text: string; html?: string; reference: string }): Promise<ChannelSendResult> {
  const channel = (await availableChannels()).find((item) => item.key === channelKey);
  if (!channel) return { ok: false, error: "CHANNEL_UNAVAILABLE" };
  const config = await getChannelConfig(channelKey);
  if (!(await channel.isConfigured(config))) return { ok: false, error: "CHANNEL_NOT_CONFIGURED" };
  const text = channel.capabilities.maxLength ? message.text.slice(0, channel.capabilities.maxLength) : message.text;
  const [result] = await channel.sendBatch([{ ...message, text, html: channel.capabilities.html ? message.html : undefined }], config);
  return result ?? { ok: false, error: "NO_RESULT" };
}
