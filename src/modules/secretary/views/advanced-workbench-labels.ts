import type { AdvancedWorkbenchLabels } from "./advanced-workbench-view";

export const advancedWorkbenchLabels: Record<"tr" | "de", AdvancedWorkbenchLabels> = {
  tr: {
    title: "Sekreter — gelişmiş işler",
    empty: "Henüz incelenecek gelişmiş işlem yok.",
    openSource: "Kaynağa git",
    approvalRequired: "İşlem uygulanmadan önce açık onayınız gereklidir.",
    kinds: {
      "mail-triage": "Gelen posta",
      "follow-up": "Takip",
      "weekly-report": "Haftalık rapor",
      "ocr-suggestion": "Evrak alan önerisi",
      "channel-consent": "Bildirim izni",
      "delegation": "Vekil yetkisi",
    },
    statuses: {
      draft: "Taslak",
      "needs-review": "İnceleme bekliyor",
      paused: "Duraklatıldı",
      complete: "Tamamlandı",
    },
  },
  de: {
    title: "Sekretariat — erweiterte Aufgaben",
    empty: "Derzeit liegen keine erweiterten Vorgänge zur Prüfung vor.",
    openSource: "Zur Quelle",
    approvalRequired: "Vor der Ausführung ist Ihre ausdrückliche Zustimmung erforderlich.",
    kinds: {
      "mail-triage": "Posteingang",
      "follow-up": "Nachverfolgung",
      "weekly-report": "Wochenbericht",
      "ocr-suggestion": "Dokumentenfeld-Vorschlag",
      "channel-consent": "Benachrichtigungseinwilligung",
      "delegation": "Vertretungsberechtigung",
    },
    statuses: {
      draft: "Entwurf",
      "needs-review": "Prüfung erforderlich",
      paused: "Pausiert",
      complete: "Abgeschlossen",
    },
  },
};
