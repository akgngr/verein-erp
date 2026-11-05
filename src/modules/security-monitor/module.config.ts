import { ShieldCheck } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { securityMonitorPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "security-monitor",
  version: "1.1.0",
  label: "Security Monitor",
  description: "Regularly runs system security tests and monitors results",
  category: "OFFICIAL",
  isProtected: false,
  hasSchema: true,
  dependencies: {
    cron: "^3.5.0",
  },
  requires: [{ module: "automation" }],
  access: [{ module: "automation", operations: ["write"] }],
  nav: [
    {
      href: "/guvenlik-izleme",
      label: "Security Monitor",
      labelKey: "monitor",
      icon: ShieldCheck,
      group: "settings",
      order: 100,
      permission: { definition: securityMonitorPermissions, action: "view" },
    },
  ],
};

export default moduleConfig;
