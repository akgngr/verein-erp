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
    { module: "members", operations: ["read"] },
    { module: "events", operations: ["read", "write"] },
    { module: "tasks", operations: ["read", "write", "delete"] },
    { module: "meetings", operations: ["read"] },
    { module: "documents", operations: ["read"] },
    { module: "donations", operations: ["read"] },
    { module: "courses", operations: ["read"] },
    { module: "system", operations: ["read"] },
    { module: "students", operations: ["read"] },
    { module: "auth", operations: ["read"] },
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
