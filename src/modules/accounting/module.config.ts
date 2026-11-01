import { BarChart3,
  Banknote, Contact, Inbox, Landmark, CalendarCheck, Download, FileText, PieChart, SlidersHorizontal, Users, Wallet } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { accountingPermissions, accountingSetupPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "accounting",
  label: "Muhasebe",
  description: "Alman dernek mevzuatına uygun çift taraflı defter tutma, fiş ve bütçe yönetimi.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "members", operations: ["read"] },
    { module: "organization", operations: ["read"] },
  ],
  dependencies: { "pdf-lib": "1.17.1" },
  nav: [
    {
      href: "/muhasebe",
      label: "Muhasebe",
      labelKey: "muhasebe",
      icon: Wallet,
      group: "main",
      order: 4,
      permission: { definition: accountingPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "invoices", label: "Faturalar", href: "/muhasebe/faturalar", icon: FileText },
    { key: "payables", label: "Gelen faturalar", href: "/muhasebe/gelen-faturalar", icon: Inbox },
    { key: "contacts", label: "Cariler", href: "/muhasebe/cariler", icon: Contact },
    { key: "bank", label: "Banka", href: "/muhasebe/banka", icon: Banknote },
    { key: "sync", label: "Üyelik aktarımı", href: "/muhasebe/uyelik-aktarimi", icon: Users },
    { key: "reports", label: "Raporlar", href: "/muhasebe/raporlar", icon: BarChart3 },
    { key: "tax", label: "Vergi", href: "/muhasebe/vergi", icon: Landmark },
    { key: "budget", label: "Bütçe", href: "/muhasebe/butce", icon: PieChart, permission: { definition: accountingSetupPermissions, action: "view" } },
    { key: "yearClosing", label: "Yıl kapanışı", href: "/muhasebe/yil-kapanisi", icon: CalendarCheck },
    { key: "settings", label: "Ayarlar", href: "/muhasebe/ayarlar", icon: SlidersHorizontal, permission: { definition: accountingSetupPermissions, action: "view" } },
    { key: "export", label: "Excel'e aktar", href: "/api/accounting/export", icon: Download, isDownload: true },
  ],
};
