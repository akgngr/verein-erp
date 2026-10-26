import type { LucideIcon } from "lucide-react";

import type { PermissionAction, PermissionDefinition } from "../permissions/define";

export type NavItem = {
  href: string;
  label: string;
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
