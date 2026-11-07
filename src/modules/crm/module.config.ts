import { Handshake } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { crmPermissions } from "./permissions";

/**
 * CRM: mevcut modüllerin üstünde ince ilişki katmanı. Kişi kaydı kaynakta kalır (üyeler, muhasebe
 * carisi); CRM aşama, sorumlu, etiket, fırsat, zaman akışı ve takip ekler (bkz. docs/specs/CRM_MODULE.md).
 */
export const moduleConfig: ModuleConfig = {
  key: "crm",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "CRM",
  description: "Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler.",
  category: "OFFICIAL",
  hasSchema: true,
  recommends: ["members", "accounting"],
  access: [
    { module: "members", operations: ["read"] },
    { module: "accounting", operations: ["read"] },
    { module: "system", operations: ["read"] },
  ],
  nav: [
    {
      href: "/crm",
      label: "CRM",
      labelKey: "crm",
      icon: Handshake,
      group: "main",
      order: 30,
      permission: { definition: crmPermissions, action: "view" },
    },
  ],
};
