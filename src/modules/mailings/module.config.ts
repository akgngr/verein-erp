import { Send } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { mailingsPermissions } from "./permissions";

/**
 * Toplu e-posta: modüllerin sunduğu alıcı kaynaklarına (recipients.ts) kişiye özel duyuru gönderir.
 * Diğer modüller server.ts → sendBulkMail ile programatik olarak da kullanabilir (erişim onayı gerekir).
 */
export const moduleConfig: ModuleConfig = {
  key: "mailings",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Toplu e-posta",
  description: "Üyelere, velilere ve diğer modüllerin alıcı listelerine kişiye özel toplu e-posta.",
  category: "OFFICIAL",
  hasSchema: true,
  access: [
    { module: "mail", operations: ["read", "write"] },
    { module: "system", operations: ["read"] },
  ],
  nav: [
    {
      href: "/toplu-eposta",
      label: "Toplu e-posta",
      labelKey: "topluEposta",
      icon: Send,
      group: "main",
      order: 92,
      permission: { definition: mailingsPermissions, action: "view" },
    },
  ],
};
