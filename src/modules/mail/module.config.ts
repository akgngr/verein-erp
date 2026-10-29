import { Mail } from "lucide-react";
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { mailPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "mail",
  label: "E-posta Altyapısı",
  description:
    "Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları.",
  category: "EXTENSION",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
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
};
