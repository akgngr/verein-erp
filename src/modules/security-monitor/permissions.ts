import { definePermissions } from "@/shared/permissions/define";

export default definePermissions({
  read: {
    label: { tr: "Güvenlik izleme verilerini görüntüle", en: "View security monitor data", de: "Sicherheitsüberwachungsdaten anzeigen" },
    description: { tr: "Test sonuçlarını, uyarıları ve istatistikleri görüntüleyin", en: "View test results, alerts, and statistics", de: "Testergebnisse, Warnungen und Statistiken anzeigen" },
  },
  write: {
    label: { tr: "Güvenlik testlerini çalıştır", en: "Run security tests", de: "Sicherheitstests ausführen" },
    description: { tr: "Yeni testler çalıştırın, zamanlamaları yönetin", en: "Run new tests, manage schedules", de: "Neue Tests ausführen, Zeitpläne verwalten" },
  },
});
