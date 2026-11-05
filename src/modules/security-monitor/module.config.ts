import { ModuleConfig } from "@/shared/types/module";
import { ShieldCheck } from "lucide-react";
import { securityMonitorPermissions } from "./permissions";

export default {
  key: "security-monitor",
  label: "Security Monitor",
  description: "Regularly runs system security tests and monitors results",
  category: "OFFICIAL",
  isProtected: false,
  dependencies: {
    "cron": "^3.0.0"
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
} satisfies ModuleConfig;
