import { FileSignature } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { onlineFormsPermissions } from "./permissions";

/**
 * Uzaktan form ve imza (s-SIGN tarzı): yönetici temel kaydı oluşturur, kişiye e-posta/SMS/WhatsApp ile süreli
 * bir bağlantı gider; kişi eksik alanları ve Datenschutz onaylarını doldurup imzalar, kayıt güncellenir.
 * Reşit olmayan öğrenci için bağlantı veliye gider ve veli onaylar.
 */
export const moduleConfig: ModuleConfig = {
  key: "online-forms",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.1",
  label: "e-Sign",
  description: "e-Sign: kişiye süreli bağlantı, form tamamlama, Datenschutz onayı, imza ve imzalı PDF belgeleri.",
  category: "OFFICIAL",
  hasSchema: true,
  requires: [{ module: "mailings" }],
  recommends: ["members", "students"],
  basePath: "/online-formlar",
  access: [
    { module: "members", operations: ["read", "write"] },
    { module: "students", operations: ["read", "write"] },
    { module: "mailings", operations: ["read", "write"] },
    { module: "organization", operations: ["read"] },
    { module: "automation", operations: ["write"] },
    { module: "system", operations: ["read"] },
  ],
  nav: [
    {
      href: "/online-formlar",
      label: "e-Sign",
      labelKey: "online-forms",
      icon: FileSignature,
      group: "main",
      order: 31,
      permission: { definition: onlineFormsPermissions, action: "view" },
    },
  ],
};
