// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleCampaignChannels } from "@/shared/campaigns/channel";

import { channels as campaignsmsChannels } from "@/modules/campaign-sms/channels";
import { channels as campaigntelegramChannels } from "@/modules/campaign-telegram/channels";
import { channels as campaignwhatsappChannels } from "@/modules/campaign-whatsapp/channels";
import { channels as mailingsChannels } from "@/modules/mailings/channels";

/** Kampanya gönderim kanalları (src/modules/<modül>/channels.ts). */
export const moduleChannelRegistry: ModuleCampaignChannels[] = [
  campaignsmsChannels,
  campaigntelegramChannels,
  campaignwhatsappChannels,
  mailingsChannels,
];
