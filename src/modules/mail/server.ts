import "server-only";

// Public e-mail API for other modules:
//   import { sendMail, sendMailBatch, isMailConfigured } from "@/modules/mail/server";
export { sendMail, sendMailBatch, isMailConfigured } from "./services/mail-service";

export { mailPermissions } from "./permissions";
export { getMailSettings } from "./queries/get-mail-settings";
export { listMailLogs, listMailLogModules } from "./queries/list-mail-logs";
export {
  saveMailSettingsAction,
  verifyMailConnectionAction,
  sendTestMailAction,
} from "./actions/mail-actions";
export type { MailMessage, MailSendResult } from "./types";
export { mailInboxPermissions } from "./permissions";
export { uploadEmlHandler, downloadAttachmentHandler } from "./services/inbox-handlers";
export {
  saveInboxSettingsAction,
  fetchInboxAction,
  importAttachmentAction,
  setInboxStatusAction,
  deleteInboxMessageAction,
} from "./actions/inbox-actions";
