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
  // KARAR: Asistanın modüllerle yaptığı işlemler buraya YAZILMAZ — her modül kendi ai.ts dosyasında
  // tanımlar (src/ai-registry.ts otomatik üretilir) ve yönetici Ayarlar → Yapay zekâ'daki izin
  // matrisinden açar. Buradaki liste yalnızca asistan altyapısının kendi kullandığı modüllerdir.
  // Yapay zekâ sağlayıcı SDK'ları (`pnpm module:deps` kök package.json'a ekler).
  dependencies: { "@anthropic-ai/sdk": "^1.3.0", "@mistralai/mistralai": "^3.4.0", openai: "^7.45.1" },
  access: [
    { module: "auth", operations: ["read"] },
    { module: "members", operations: ["read"] }, // maskeleme: bilinen kişi adlarının listesi
    { module: "organization", operations: ["read"] }, // eski PDF raporlarında dernek anteti
    { module: "students", operations: ["read"] }, // maskeleme: öğrenci ve veli adları
    { module: "system", operations: ["read"] }, // kullanılabilir modüller
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
