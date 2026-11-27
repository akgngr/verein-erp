import "server-only";

// Public server API: settings query enforces its own permission and never returns secrets.
export { listProviderSettings } from "./queries/settings";
export { socialLoginPermissions } from "./permissions";
