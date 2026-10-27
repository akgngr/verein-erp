/**
 * Muhasebe PDF metinleri (Faz 4, § 11.8): de VARSAYILAN, tr opsiyonel.
 * Tek arayüz — eksik çeviri DERLEME HATASIDIR. Kassenbuch + Kassenbericht.
 */

export type AccountingStrings = {
  /** Kasa defteri */
  ledgerTitle: string;
  colDate: string;
  colNumber: string;
  colDescription: string;
  colReceipt: string;
  colIncome: string;
  colExpense: string;
  colBalance: string;
  openingBalance: string;
  closingBalance: string;
  reversedMark: string;
  /** Kassenbericht */
  annualTitle: (year: number) => string;
  sectionBalances: string;
  colAccount: string;
  colOpening: string;
  colClosing: string;
  sectionIncomeExpense: string;
  colPlan: string;
  colActual: string;
  colDiff: string;
  colPreviousYear: string;
  incomeTotal: string;
  expenseTotal: string;
  surplusLabel: string;
  sectionProjects: string;
  colProject: string;
  colProjectIncome: string;
  colProjectExpense: string;
  colProjectBalance: string;
  missingReceiptsNote: (count: number) => string;
  economicWarning80: string;
  economicExceeded: string;
  /** İmza blokları (§ 11.8 md. 4) */
  createdByLine: string;
  cashAuditLine: string;
  /** Ortak */
  sphereLabels: Record<"IDEELL" | "ASSET_MANAGEMENT" | "PURPOSE_OPERATION" | "ECONOMIC_OPERATION", string>;
  none: string;
  footerPage: (page: number, total: number) => string;
};

export const ACCOUNTING_STRINGS: { de: AccountingStrings; tr: AccountingStrings } = {
  de: {
    ledgerTitle: "KASSENBUCH",
    colDate: "Datum",
    colNumber: "Buchungsnr.",
    colDescription: "Beschreibung",
    colReceipt: "Beleg-Nr.",
    colIncome: "Einnahme",
    colExpense: "Ausgabe",
    colBalance: "Saldo",
    openingBalance: "Anfangsbestand",
    closingBalance: "Endbestand",
    reversedMark: "STORNIERT",
    annualTitle: (year) => `KASSENBERICHT ${year}`,
    sectionBalances: "Konten (Anfangs- und Endbestand)",
    colAccount: "Konto",
    colOpening: "Anfangsbestand",
    colClosing: "Endbestand",
    sectionIncomeExpense: "Einnahmen-Ausgaben-Rechnung",
    colPlan: "Plan",
    colActual: "Ist",
    colDiff: "Differenz",
    colPreviousYear: "Vorjahr",
    incomeTotal: "Einnahmen gesamt",
    expenseTotal: "Ausgaben gesamt",
    surplusLabel: "Überschuss / Fehlbetrag",
    sectionProjects: "Projekte",
    colProject: "Projekt",
    colProjectIncome: "Einnahmen",
    colProjectExpense: "Ausgaben",
    colProjectBalance: "Saldo",
    missingReceiptsNote: (count) =>
      `Hinweis: ${count} Buchung(en) ohne Beleg („Beleg fehlt").`,
    economicWarning80:
      "Die Einnahmen des steuerpflichtigen wirtschaftlichen Geschäftsbetriebs erreichen 80 % der Grenze von 50.000 € (§ 64 Abs. 3 AO).",
    economicExceeded:
      "Die Einnahmen des steuerpflichtigen wirtschaftlichen Geschäftsbetriebs haben die Grenze von 50.000 € überschritten (§ 64 Abs. 3 AO). Bitte Steuerberatung hinzuziehen.",
    createdByLine: "Erstellt von (Kassenwart):",
    cashAuditLine: "Kassenprüfung durchgeführt am:",
    sphereLabels: {
      IDEELL: "Ideeller Bereich",
      ASSET_MANAGEMENT: "Vermögensverwaltung",
      PURPOSE_OPERATION: "Zweckbetrieb",
      ECONOMIC_OPERATION: "Wirtschaftlicher Geschäftsbetrieb",
    },
    none: "–",
    footerPage: (page, total) => `Seite ${page} von ${total}`,
  },
  tr: {
    ledgerTitle: "KASA DEFTERİ (KASSENBUCH)",
    colDate: "Tarih",
    colNumber: "Fiş No",
    colDescription: "Açıklama",
    colReceipt: "Belge No",
    colIncome: "Gelir",
    colExpense: "Gider",
    colBalance: "Bakiye",
    openingBalance: "Dönem başı bakiyesi",
    closingBalance: "Dönem sonu bakiyesi",
    reversedMark: "İPTAL EDİLDİ",
    annualTitle: (year) => `KASSENBERICHT ${year}`,
    sectionBalances: "Hesaplar (dönem başı / dönem sonu)",
    colAccount: "Hesap",
    colOpening: "Dönem başı",
    colClosing: "Dönem sonu",
    sectionIncomeExpense: "Gelir-Gider Tablosu (Einnahmen-Ausgaben-Rechnung)",
    colPlan: "Plan",
    colActual: "Gerçekleşen",
    colDiff: "Fark",
    colPreviousYear: "Önceki yıl",
    incomeTotal: "Gelir toplamı",
    expenseTotal: "Gider toplamı",
    surplusLabel: "Fazla veya eksik (Überschuss/Fehlbetrag)",
    sectionProjects: "Projeler",
    colProject: "Proje",
    colProjectIncome: "Gelir",
    colProjectExpense: "Gider",
    colProjectBalance: "Bakiye",
    missingReceiptsNote: (count) =>
      `Not: ${count} fişin belgesi yok ("Belge eksik (Beleg fehlt)").`,
    economicWarning80:
      "Ticari işletme gelirleri 50.000 € sınırının %80'ine ulaştı (§ 64 Abs. 3 AO).",
    economicExceeded:
      "Ticari işletme gelirleri 50.000 € sınırını aştı (§ 64 Abs. 3 AO). Vergi danışmanına başvurun.",
    createdByLine: "Hazırlayan (Kassenwart):",
    cashAuditLine: "Kasa denetimi yapıldı (Kassenprüfung):",
    sphereLabels: {
      IDEELL: "İdeel alan (ideeller Bereich)",
      ASSET_MANAGEMENT: "Varlık yönetimi (Vermögensverwaltung)",
      PURPOSE_OPERATION: "Amaca bağlı işletme (Zweckbetrieb)",
      ECONOMIC_OPERATION: "Ticari işletme (wirtschaftlicher Geschäftsbetrieb)",
    },
    none: "—",
    footerPage: (page, total) => `Sayfa ${page} / ${total}`,
  },
};
