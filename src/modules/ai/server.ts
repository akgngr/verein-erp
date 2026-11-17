import "server-only";

// ai modülü — sunucu public girişi
export { aiPermissions } from "./permissions";
export { aiChatHandler } from "./handlers/chat";
export { documentSummaryHandler } from "./handlers/document-summary";
export { financeInsightHandler } from "./handlers/finance-insight";
export { aiAttachmentHandler } from "./handlers/attachments";
export { aiReportPdfHandler } from "./handlers/report-pdf";
export { acceptAiConsentAction, revokeAiConsentAction, setAiProviderAction } from "./actions/consent-actions";
export { getActiveProvider, hasAiConsent, isAiConfigured } from "./services/consent";
export { AiSettingsView } from "./views/ai-settings-view";
export { AiAssistantSlot } from "./views/ai-assistant-slot";
