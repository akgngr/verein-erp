import "server-only";

// Diğer modüller için (erişim onayı gerekir): import { sendBulkMail } from "@/modules/mailings/server";
export { mailingsPermissions } from "./permissions";
export { sendBulkMail } from "./services/campaigns";
export { listCampaignSummaries } from "./services/campaigns";
export { previewMailingAction, sendMailingTestAction, launchCampaignAction } from "./actions/mailing-actions";
