import type { LucideIcon } from "lucide-react";

import type { PermissionAction, PermissionDefinition } from "../permissions/define";

export type ModuleCategory = "CORE" | "OFFICIAL" | "EXTENSION";

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

export type TopNavItem = {
  key: string;
  label: string;
  /** i18n anahtarı: modül çevirisinde (örn: accounting.actions.<key>) çözülür. */
  labelKey?: string;
  href: string;
  /** Lucide ikon adı (örn: "Users", "BarChart3", "Download", "SlidersHorizontal"). */
  icon?: string;
  /** true ise dosya indirme/API bağlantısı olarak işlenir. */
  isDownload?: boolean;
};

export type ModuleConfig = {
  key: string;
  label: string;
  description?: string;
  version?: string;
  author?: string;
  category: ModuleCategory;
  /** CORE modüller için true (pasife alınamaz, silinemez). */
  isProtected?: boolean;
  hasSchema?: boolean;
  nav: NavItem[];
  topNav?: TopNavItem[];
};
