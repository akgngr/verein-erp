import { UsersRound } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { usersPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "users",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Kullanıcılar",
  description: "Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Rol dizini: modül rollerinin kullanılabilirliği için kurulu/etkin modüller okunur.
  access: [{ module: "system", operations: ["read"] }],
  nav: [
    {
      href: "/ayarlar/kullanicilar",
      label: "Kullanıcılar",
      labelKey: "kullanicilar",
      icon: UsersRound,
      group: "settings",
      order: 1,
      permission: { definition: usersPermissions, action: "view" },
    },
  ],
};
