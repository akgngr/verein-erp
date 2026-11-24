import "server-only";

export { memberPortalPermissions } from "./permissions";
export {
  getActivePortalSession,
  requestPortalMagicLink,
  consumePortalMagicLinkPost,
  signOutEverywhere,
} from "./services/auth";
export {
  PORTAL_NONCE_COOKIE,
  PORTAL_SESSION_COOKIE,
  isPortalEnabled,
  isPortalSessionActive,
  isPortalStepUpActive,
  maskIban,
} from "./services/auth-core";
export { getPortalMasterData } from "./services/master-data";
export { listPortalPasskeys, registerPortalPasskey, completePasskeyStepUp } from "./services/passkey";
export { POST as magicLinkHandler } from "./api/magic-link/route";
export { POST as confirmMagicLinkHandler } from "./api/confirm/route";
export { POST as portalLogoutHandler } from "./api/logout/route";
export { POST as handlePortalCorrectionPost } from "./api/corrections/route";
export { POST as handlePortalConsentPost } from "./api/consents/route";
export { GET as handlePortalConsentConfirmGet } from "./api/consents/confirm/route";
export { GET as handlePortalReceiptDownloadGet } from "./api/receipts/[ref]/route";
export { signReceiptRef, verifyReceiptRef } from "./services/receipt-ref";
export {
  CONSENT_TEXT_VERSION,
  listPortalConsents,
  listPortalReceipts,
  listPortalCorrections,
  submitPortalCorrection,
  revokePortalConsent,
  requestPortalConsentOptIn,
  confirmPortalConsentOptIn,
} from "./services/self-service";
export { POST as handlePortalArt15Post } from "./api/art15/route";
export { GET as handlePortalArt15DownloadGet } from "./api/art15/download/route";
export { POST as handlePortalEventRegisterPost } from "./api/events/route";
export { POST as handlePortalSigningPost } from "./api/signing/route";
export {
  PORTAL_BUSINESS_FEATURE,
  hasPortalBusinessLicense,
  listPortalArt15Requests,
  listArt15RequestsForBoard,
  requestPortalArt15Export,
  downloadPortalArt15Export,
  listPortalProcessingLog,
  listPortalBusinessFeatures,
  registerPortalEvent,
  signPortalPendingForm,
} from "./services/rights";
