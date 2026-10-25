import { UsersRound } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { usersPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "users",
  label: "Kullanıcılar",
  nav: [
    {
      href: "/ayarlar/kullanicilar",
      label: "Kullanıcılar",
      icon: UsersRound,
      group: "settings",
      order: 1,
      permission: { definition: usersPermissions, action: "view" },
    },
  ],
};
