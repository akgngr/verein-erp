import { Mail, ScrollText, Settings } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { mailPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "mail",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "E-posta Altyapısı",
  description:
    "Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // SMTP gönderimi (`pnpm module:deps` kök package.json'a ekler).
  dependencies: { nodemailer: "^10.2.1" },
  nav: [
    {
      href: "/mail",
      label: "E-posta",
      labelKey: "mail",
      icon: Mail,
      group: "settings",
      order: 50,
      permission: { definition: mailPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "settings", label: "Ayarlar", href: "/mail", icon: Settings },
    { key: "logs", label: "Gönderim kayıtları", href: "/mail/kayitlar", icon: ScrollText },
  ],
};
