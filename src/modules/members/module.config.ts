import { BarChart3, Download, FileSpreadsheet, Tag, Users } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { memberPaymentsPermissions, memberTypesPermissions, membersPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "members",
  label: "Üyeler",
  description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "organization", operations: ["read"] },
  ],
  nav: [
    {
      href: "/uyeler",
      label: "Üyeler",
      labelKey: "uyeler",
      icon: Users,
      group: "main",
      order: 3,
      permission: { definition: membersPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "dues", label: "Aidat raporu", href: "/uyeler/aidat", icon: BarChart3, permission: { definition: memberPaymentsPermissions, action: "view" } },
    { key: "types", label: "Üyelik türleri", href: "/uyeler/turler", icon: Tag, permission: { definition: memberTypesPermissions, action: "view" } },
    { key: "import", label: "İçe aktar", href: "/uyeler/ice-aktar", icon: FileSpreadsheet, permission: { definition: membersPermissions, action: "create" } },
    { key: "export", label: "Excel'e aktar", href: "/api/members/export", icon: Download, isDownload: true },
  ],
};
