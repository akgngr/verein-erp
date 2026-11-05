import { Activity } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { automationPermissions } from "./permissions";

/** Kalıcı arka plan işleri ve workflow altyapısı. */
export const moduleConfig: ModuleConfig = {
  key: "automation",
  version: "0.5.7",
  label: "Otomasyon",
  description: "Kalıcı arka plan görevleri ve iş akışları.",
  category: "EXTENSION",
  hasSchema: true,
  access: [
    { module: "mailings", operations: ["read", "write"] },
    { module: "mail", operations: ["read"] },
  ],
  dependencies: {
    "pg-boss": "12.38.0",
  },
  basePath: "/automation",
  nav: [
    {
      href: "/automation",
      label: "Otomasyon İzleme",
      labelKey: "monitor",
      icon: Activity,
      group: "settings",
      order: 30,
      permission: { definition: automationPermissions, action: "view" },
    },
  ],
};

export { automationPermissions };
