import type { ModuleConfig } from "@/shared/types/module";

import { automationPermissions } from "./permissions";

/** Kalıcı arka plan işleri ve workflow altyapısı. */
export const moduleConfig: ModuleConfig = {
  key: "automation",
  version: "0.5.1",
  label: "Otomasyon",
  description: "Kalıcı arka plan görevleri ve iş akışları.",
  category: "EXTENSION",
  hasSchema: true,
  access: [{ module: "mailings", operations: ["write"] }],
  dependencies: {
    "pg-boss": "12.38.0",
  },
  basePath: "/automation",
  nav: [],
};

export { automationPermissions };
