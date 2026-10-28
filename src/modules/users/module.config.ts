import { UsersRound } from "lucide-react";

import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { usersPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "users",
  label: "Kullanıcılar",
  description: "Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  topNav: topNav as TopNavItem[],
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
