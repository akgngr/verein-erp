// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleCampaignChannels } from "@/shared/campaigns/channel";

import { channels as mailingsChannels } from "@/modules/mailings/channels";

/** Kampanya gönderim kanalları (src/modules/<modül>/channels.ts). */
export const moduleChannelRegistry: ModuleCampaignChannels[] = [
  mailingsChannels,
];
