import type { LucideIcon } from "lucide-react";

import type { PermissionAction, PermissionDefinition } from "../permissions/define";

export type NavItem = {
  href: string;
  label: string;
  /** i18n anahtarı (Faz 4): messages/*.json'da nav.<key> olarak çözülür. */
  labelKey?: string;
  icon: LucideIcon;
  group: "main" | "settings";
  order: number;
  permission: { definition: PermissionDefinition; action: PermissionAction };
};

export type ModuleConfig = {
  key: string;
  label: string;
  nav: NavItem[];
};
