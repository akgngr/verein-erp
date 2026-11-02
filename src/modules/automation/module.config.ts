import type { ModuleConfig } from "@/shared/types/module";

import { automationPermissions } from "./permissions";

/**
 * Kalıcı arka plan işleri ve workflow altyapısı.
 * Bu ilk sürüm yalnızca güvenilir görev sözleşmesini sağlar; worker/queue sonraki PR'dadır.
 */
export const moduleConfig: ModuleConfig = {
  key: "automation",
  version: "0.1.0",
  label: "Otomasyon",
  description: "Kalıcı arka plan görevleri ve iş akışları.",
  category: "EXTENSION",
  hasSchema: false,
  basePath: "/automation",
  nav: [],
};

export { automationPermissions };
