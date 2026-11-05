import { ModuleConfig } from "@/shared/types/module";

export default {
  key: "security-monitor",
  label: { tr: "Güvenlik İzleme", en: "Security Monitor", de: "Sicherheitsüberwachung" },
  description: {
    tr: "Sistem güvenlik testlerini düzenli olarak çalıştırır ve sonuçları izler",
    en: "Regularly runs system security tests and monitors results",
    de: "Führt regelmäßig System-Sicherheitstests durch und überwacht die Ergebnisse",
  },
  category: "system",
  access: "admin",
  icon: "ShieldCheck",
  order: 100,
} satisfies ModuleConfig;
