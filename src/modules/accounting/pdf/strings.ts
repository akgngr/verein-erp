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
  /** Genel Kurul Kassenbericht (Q3) */
  treasurerReport: {
    title: (year: number) => string;
    subtitle: string;
    spheresSection: string;
    colSphere: string;
    colIncome: string;
    colExpense: string;
    colNet: string;
    colPrevYear: string;
    colChange: string;
    projectsSection: string;
    colProject: string;
    reservesSection: string;
    openingReserves: string;
    closingReserves: string;
    netAnnualSurplus: string;
    earmarkedFunds: string;
    freeReserves: string;
    summaryTitle: string;
    summaryIncomeSurplus: (year: number, income: string, expense: string, surplus: string) => string;
    summaryIncomeDeficit: (year: number, income: string, expense: string, deficit: string) => string;
    summaryIdeell: (net: string) => string;
    summaryProjects: (count: number, earmarked: string) => string;
    summaryNoProjects: string;
    summaryReserves: (closing: string, free: string) => string;
    summaryRecordedReserves: (recorded: string) => string;
    recommendation: (year: number) => string;
    unknownProject: string;
    treasurerSign: string;
    auditorSign: string;
    placeDate: string;
    sphereLabelsNumbered: Record<"IDEELL" | "ASSET_MANAGEMENT" | "PURPOSE_OPERATION" | "ECONOMIC_OPERATION", string>;
  };
};

export type AccountingLanguage = "de" | "tr";

export const ACCOUNTING_STRINGS: Record<AccountingLanguage, AccountingStrings> = {
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
    treasurerReport: {
      title: (year) => `Kassenbericht für die Mitgliederversammlung — ${year}`,
      subtitle: "Aggregierter Finanz- und Tätigkeitsbericht (Ohne personenbezogene Daten)",
      spheresSection: "Einnahmen und Ausgaben nach steuerlichen Bereichen (§ 5)",
      colSphere: "Tätigkeitsbereich",
      colIncome: "Einnahmen",
      colExpense: "Ausgaben",
      colNet: "Netto",
      colPrevYear: "Vorjahr",
      colChange: "Veränderung",
      projectsSection: "Projektbezogene Mittelverwendung",
      colProject: "Projekt",
      reservesSection: "Mittel- und Rücklagenstand (§ 62 AO)",
      openingReserves: "Liquider Anfangsbestand:",
      closingReserves: "Liquider Endbestand:",
      netAnnualSurplus: "Jahresergebnis:",
      earmarkedFunds: "Zweckgebundene Rücklagen:",
      freeReserves: "Freie Rücklagen:",
      summaryTitle: "Zusammenfassung des Schatzmeisters",
      summaryIncomeSurplus: (year, income, expense, surplus) =>
        `Im Geschäftsjahr ${year} beliefen sich die Gesamteinnahmen auf ${income} und die Gesamtausgaben auf ${expense}. Das Geschäftsjahr schließt mit einem Jahresüberschuss von ${surplus} ab.`,
      summaryIncomeDeficit: (year, income, expense, deficit) =>
        `Im Geschäftsjahr ${year} beliefen sich die Gesamteinnahmen auf ${income} und die Gesamtausgaben auf ${expense}. Das Geschäftsjahr schließt mit einem Jahresfehlbetrag von ${deficit} ab.`,
      summaryIdeell: (net) =>
        `Im ideellen Bereich (Mitgliedsbeiträge und Spenden) wurde ein Nettoergebnis von ${net} erzielt.`,
      summaryProjects: (count, earmarked) =>
        `Im Berichtszeitraum wurden ${count} Projekte geführt; der zweckgebundene Mittelbestand beträgt ${earmarked}.`,
      summaryNoProjects: "Im Berichtszeitraum wurden keine gesonderten Projektbuchungen erfasst.",
      summaryReserves: (closing, free) =>
        `Der Gesamtbestand der liquiden Mittel (Kasse und Bankkonten) belief sich zum Stichtag auf ${closing} (davon freie Rücklagen: ${free}).`,
      summaryRecordedReserves: (recorded) =>
        `Die nach § 62 AO ausgewiesenen Rücklagen belaufen sich auf insgesamt ${recorded}.`,
      recommendation: () =>
        "Die Kassenprüfung ergab eine ordnungsgemäße Buch- und Belegführung. Der Mitgliederversammlung wird die Entlastung des Schatzmeisters und des Vorstands empfohlen.",
      unknownProject: "Unbekanntes Projekt",
      treasurerSign: "Unterschrift Schatzmeister / Vorstand",
      auditorSign: "Unterschrift Kassenprüfer",
      placeDate: "Ort, Datum:",
      sphereLabelsNumbered: {
        IDEELL: "1. Ideeller Bereich (Beiträge & Spenden)",
        ASSET_MANAGEMENT: "2. Vermögensverwaltung",
        PURPOSE_OPERATION: "3. Zweckbetrieb",
        ECONOMIC_OPERATION: "4. Wirtschaftlicher Geschäftsbetrieb",
      },
    },
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
    treasurerReport: {
      title: (year) => `Kassenbericht (Kasa ve Bütçe Raporu) — ${year}`,
      subtitle: "Genel Kurul Sunumu için Toplulaştırılmış Finansal Rapor (Kişisel veri içermez)",
      spheresSection: "Faaliyet Alanlarına Göre Gelir ve Gider Dağılımı (§ 5)",
      colSphere: "Faaliyet Alanı",
      colIncome: "Gelir",
      colExpense: "Gider",
      colNet: "Net Sonuç",
      colPrevYear: "Önceki Yıl",
      colChange: "Yıllık Değişim",
      projectsSection: "Proje Bazlı Fon ve Bütçe Durumu",
      colProject: "Proje Adı",
      reservesSection: "Fonlar ve Rezerv Durumu (§ 62 AO)",
      openingReserves: "Dönem Başı Likit Rezerv:",
      closingReserves: "Dönem Sonu Toplam Rezerv:",
      netAnnualSurplus: "Yıllık Net Bakiye:",
      earmarkedFunds: "Amaca Bağlı (Zweckgebunden) Proje Fonları:",
      freeReserves: "Serbest Rezervler (Freie Rücklagen):",
      summaryTitle: "Dönem Özeti ve Sayman Değerlendirmesi",
      summaryIncomeSurplus: (year, income, expense, surplus) =>
        `${year} faaliyet döneminde derneğin toplam geliri ${income}, toplam gideri ${expense} olarak gerçekleşmiştir. Dönem net ${surplus} fazlalıkla tamamlanmıştır.`,
      summaryIncomeDeficit: (year, income, expense, deficit) =>
        `${year} faaliyet döneminde derneğin toplam geliri ${income}, toplam gideri ${expense} olarak gerçekleşmiştir. Dönem net ${deficit} açıkla tamamlanmıştır.`,
      summaryIdeell: (net) =>
        `İdeel alandaki (üye aidatları ve bağışlar) net bakiye ${net} seviyesindedir.`,
      summaryProjects: (count, earmarked) =>
        `Dönem içinde ${count} aktif projede faaliyet yürütülmüş, amaca bağlı fon bakiyesi ${earmarked} olarak kaydedilmiştir.`,
      summaryNoProjects: "Dönem içinde ayrı bir proje kaydı yürütülmemiştir.",
      summaryReserves: (closing, free) =>
        `Kasa ve banka hesaplarındaki toplam likit rezerv yıl sonunda ${closing} seviyesine ulaşmıştır (serbest rezerv: ${free}).`,
      summaryRecordedReserves: (recorded) =>
        `§ 62 AO kapsamında kayıtlı toplam yedek akçe tutarı ${recorded} seviyesindedir.`,
      recommendation: (year) =>
        `${year} yılı defter, belge ve hesap denetimleri sonucunda kasa hareketlerinin nizami olduğu tespit edilmiş olup, Genel Kurul'a Sayman ve Yönetim Kurulu'nun ibrası tavsiye edilir.`,
      unknownProject: "Bilinmeyen Proje",
      treasurerSign: "Sayman (Schatzmeister) İmzası",
      auditorSign: "Kasa Denetçisi (Kassenprüfer) İmzası",
      placeDate: "Tarih ve Yer:",
      sphereLabelsNumbered: {
        IDEELL: "1. İdeel Alan (Aidat & Bağışlar)",
        ASSET_MANAGEMENT: "2. Varlık Yönetimi (Faiz / Kira)",
        PURPOSE_OPERATION: "3. Amaca Bağlı İşletme (Zweckbetrieb)",
        ECONOMIC_OPERATION: "4. Ticari İşletme (Wirtschaftlich)",
      },
    },
  },
};
