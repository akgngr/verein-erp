import { Activity, Workflow } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { automationPermissions } from "./permissions";

/** Kalıcı arka plan işleri ve workflow altyapısı. */
export const moduleConfig: ModuleConfig = {
  key: "automation",
  version: "0.7.0",
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
    "@workflowbuilder/sdk": "3.0.0",
    "@xyflow/react": "12.10.2",
    zustand: "5.0.8",
  },
  basePath: "/automation",
  nav: [
    {
      href: "/automation",
      label: "Otomasyon İzleme",
      labelKey: "automationMonitor",
      icon: Activity,
      group: "settings",
      order: 30,
      permission: { definition: automationPermissions, action: "view" },
    },
    {
      href: "/automation/workflows",
      label: "İş Akışları",
      labelKey: "automationWorkflows",
      icon: Workflow,
      group: "settings",
      order: 31,
      permission: { definition: automationPermissions, action: "view" },
    },
  ],
};

export { automationPermissions };
