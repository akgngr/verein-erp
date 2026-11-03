import "server-only";

// mail modülü — worker/otomasyonlar için framework bağımsız sunucu API'si.
// Next.js action, route veya UI modüllerini bu girişe eklemeyin.
export { sendMail, sendMailBatch, isMailConfigured, listSuccessfulMailRecipients } from "./services/mail-service";
