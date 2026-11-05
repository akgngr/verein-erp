import { ModuleConfig } from "@/shared/types/module";
import { ShieldCheck } from "lucide-react";
import { securityMonitorPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "security-monitor",
  version: "1.0.0",
  label: "Security Monitor",
  description: "Regularly runs system security tests and monitors results",
  category: "OFFICIAL",
  isProtected: false,
  dependencies: {
    "cron": "^3.5.0"
  },
  nav: [
    {
      href: "/guvenlik-izleme",
      label: "Security Monitor",
      labelKey: "modules.securityMonitor.title",
      icon: ShieldCheck,
      group: "settings",
      order: 100,
      permission: { definition: securityMonitorPermissions, action: "view" },
    },
  ],
};

export default moduleConfig;

export { securityMonitorPermissions };
