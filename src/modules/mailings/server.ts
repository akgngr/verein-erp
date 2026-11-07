import "server-only";

// Diğer modüller için (erişim onayı gerekir): import { sendBulkMail } from "@/modules/mailings/server";
export { mailingsPermissions } from "./permissions";
export { sendBulkMail } from "./services/campaigns";
export { listCampaignSummaries } from "./services/campaigns";
export { previewMailingAction, sendMailingTestAction, launchCampaignAction } from "./actions/mailing-actions";
// Kanal eklentileri için (ör. Telegram webhook): ayarlar yalnız sunucuda çözülür.
export { getChannelConfig } from "./services/campaigns";
export { campaignShortcutHref } from "./services/shortcuts";
// Kanal eklentilerinin teslim/okundu bildirimleri için.
export { recordProviderStatus } from "./services/tracking";
export { listDirectChannels, sendDirectMessage } from "./services/direct";
