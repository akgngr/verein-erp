import { Sparkles } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { aiPermissions } from "./permissions";

/**
 * Yapay zekâ asistanı. KARAR (KVKK/DSGVO): EXTENSION kategorisindedir, böylece varsayılan
 * olarak KAPALIDIR ve başka modüllere erişimi yöneticinin açık onayı olmadan başlamaz
 * (resmi modüllerin otomatik onayı burada uygulanmaz). Ayrıca her kullanıcı kendi rızasını verir.
 */
export const moduleConfig: ModuleConfig = {
  key: "ai",
  label: "Yapay zekâ asistanı",
  description: "Sağ panelde sohbet eden, yalnızca izin verilen modüllerin toplu verisini okuyan asistan.",
  category: "EXTENSION",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "accounting", operations: ["read"] },
    { module: "auth", operations: ["read"] },
    { module: "courses", operations: ["read", "write", "delete"] },
    { module: "documents", operations: ["read", "write", "delete"] },
    { module: "donations", operations: ["read"] },
    { module: "events", operations: ["read", "write"] },
    { module: "inventory", operations: ["read", "write", "delete"] },
    { module: "meetings", operations: ["read", "write", "delete"] },
    { module: "members", operations: ["read"] },
    { module: "organization", operations: ["read"] },
    { module: "progress", operations: ["read"] },
    { module: "students", operations: ["read"] },
    { module: "system", operations: ["read"] },
    { module: "tasks", operations: ["read", "write", "delete"] },
  ],

  nav: [
    {
      href: "/ayarlar/yapay-zeka",
      label: "Yapay zekâ asistanı",
      labelKey: "ai",
      icon: Sparkles,
      group: "settings",
      order: 60,
      permission: { definition: aiPermissions, action: "view" },
    },
  ],
};
