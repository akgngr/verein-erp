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
