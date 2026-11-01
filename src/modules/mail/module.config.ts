import { Inbox, Mail, ScrollText, Settings } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { mailInboxPermissions, mailPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "mail",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "E-posta Altyapısı",
  description:
    "Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // SMTP gönderimi; IMAP gelen kutusu okuma ve MIME ayrıştırma (`pnpm module:deps` kök package.json'a ekler).
  // Gelen kutusu: belge eklerini muhasebe gelen faturalarına aktarır; muhasebe etkin mi diye modül durumunu okur.
  access: [
    { module: "accounting", operations: ["write"] },
    { module: "system", operations: ["read"] },
  ],
  dependencies: { nodemailer: "^10.2.1", imapflow: "^2.10.0", mailparser: "^3.14.1" },
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
    {
      // Sayman gelen kutusuna (belge e-postaları) SMTP ayarlarını görmeden ulaşabilsin.
      href: "/mail/gelen-kutusu",
      label: "Gelen kutusu",
      labelKey: "gelenKutusu",
      icon: Inbox,
      group: "settings",
      order: 51,
      permission: { definition: mailInboxPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "settings", label: "Ayarlar", href: "/mail", icon: Settings },
    { key: "logs", label: "Gönderim kayıtları", href: "/mail/kayitlar", icon: ScrollText },
    { key: "inbox", label: "Gelen kutusu", href: "/mail/gelen-kutusu", icon: Inbox, permission: { definition: mailInboxPermissions, action: "view" } },
  ],
};
