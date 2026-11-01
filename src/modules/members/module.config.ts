import { BarChart3, Download, FileSpreadsheet, Send, Tag, Users } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { memberMailingsPermissions, memberPaymentsPermissions, memberTypesPermissions, membersPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "members",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "Üyeler",
  description: "Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "organization", operations: ["read"] },
    { module: "mail", operations: ["read", "write"] },
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
    { key: "mailing", label: "Toplu e-posta", href: "/uyeler/toplu-eposta", icon: Send, permission: { definition: memberMailingsPermissions, action: "view" } },
    { key: "import", label: "İçe aktar", href: "/uyeler/ice-aktar", icon: FileSpreadsheet, permission: { definition: membersPermissions, action: "create" } },
    { key: "export", label: "Excel'e aktar", href: "/api/members/export", icon: Download, isDownload: true },
  ],
};
