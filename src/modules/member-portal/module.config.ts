import type { ModuleConfig } from "@/shared/types/module";

import { memberPortalPermissions } from "./permissions";

/**
 * Member portal (ADR 0010, RFC-003): passwordless magic-link + passkey step-up,
 * path-isolated surface (/portal), read-only master data in P1. PORTAL_ENABLED=false by default.
 */
export const moduleConfig: ModuleConfig = {
  key: "member-portal",
  version: "0.1.0",
  label: "Üye Portalı",
  description: "Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı.",
  category: "EXTENSION",
  hasSchema: true,
  access: [
    { module: "members", operations: ["read"] },
    { module: "students", operations: ["read"] },
    { module: "mail", operations: ["write"] },
  ],
  nav: [],
};

export { memberPortalPermissions };
