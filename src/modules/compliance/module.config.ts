import { ClipboardCheck } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { compliancePermissions } from "./permissions";

/**
 * Gemeinnützigkeit compliance cockpit (ADR 0009, #414). Rules are reviewed data; inputs come only from
 * aggregate metric providers (`compliance.ts` in owning modules). Never acts: findings and optional draft tasks.
 * Internal checklist, not tax advice. label/description are fallbacks; messages → compliance.module.*.
 */
export const moduleConfig: ModuleConfig = {
  key: "compliance",
  version: "0.2.0",
  label: "Uyum kontrolü",
  description: "Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir.",
  category: "EXTENSION",
  hasSchema: true,
  access: [
    { module: "system", operations: ["read"] }, // kullanılabilir modüller (sağlayıcı modülü açık mı)
    { module: "tasks", operations: ["write"] }, // bulgudan taslak görev (insan onayıyla)
    { module: "exports", operations: ["write"] }, // PDF/CSV dışa aktarım
  ],
  recommends: ["accounting"],
  nav: [
    {
      href: "/compliance",
      label: "Uyum kontrolü",
      labelKey: "compliance",
      icon: ClipboardCheck,
      group: "main",
      order: 86,
      permission: { definition: compliancePermissions, action: "view" },
    },
  ],
};

export { compliancePermissions };
