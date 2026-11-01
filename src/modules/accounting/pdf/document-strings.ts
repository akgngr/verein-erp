/**
 * Fiş belgeleri, fiş listesi ve fatura PDF metinleri: de VARSAYILAN, tr opsiyonel.
 * Tek arayüz — eksik çeviri DERLEME HATASIDIR.
 */

export type DocumentStrings = {
  /** Fiş belgesi başlıkları (türe göre) */
  voucherTitle: { INCOME: string; EXPENSE: string; TRANSFER: string };
  voucherIntro: { INCOME: string; EXPENSE: string; TRANSFER: string };
  number: string;
  date: string;
  amount: string;
  amountInWords: string;
  payer: string;
  payee: string;
  purpose: string;
  account: string;
  transfer: string;
  category: string;
  project: string;
  receiptReference: string;
  reversed: (reason: string) => string;
  signatureReceiver: string;
  signaturePayer: string;
  signatureTreasurer: string;
  placeDate: string;
  /** Liste */
  listTitle: string;
  listPeriod: (year: string) => string;
  colDate: string;
  colNumber: string;
  colType: string;
  colDescription: string;
  colCategory: string;
  colAccount: string;
  colIncome: string;
  colExpense: string;
  typeLabels: { INCOME: string; EXPENSE: string; TRANSFER: string };
  totals: string;
  balance: string;
  truncated: (max: number) => string;
  /** Fatura */
  invoiceTitle: string;
  proformaTitle: string;
  quoteTitle: string;
  quoteNumber: string;
  quoteNote: string;
  cancelledStamp: string;
  invoiceNumber: string;
  proformaNumber: string;
  draftNumber: string;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  recipient: string;
  colPos: string;
  colItem: string;
  colQty: string;
  colUnitPrice: string;
  colTax: string;
  colTotal: string;
  net: string;
  taxLine: (rate: string) => string;
  gross: string;
  proformaNote: string;
  paymentNote: (due: string, number: string) => string;
  bank: string;
  contact: string;
  taxNumber: string;
  none: string;
  footerPage: (page: number, total: number) => string;
};

export const DOCUMENT_STRINGS: { de: DocumentStrings; tr: DocumentStrings } = {
  de: {
    voucherTitle: { INCOME: "QUITTUNG / ZAHLUNGSBESTÄTIGUNG", EXPENSE: "AUSZAHLUNGSBELEG", TRANSFER: "UMBUCHUNGSBELEG" },
    voucherIntro: {
      INCOME: "Hiermit bestätigen wir den Empfang des folgenden Betrags:",
      EXPENSE: "Der folgende Betrag wurde ausgezahlt:",
      TRANSFER: "Der folgende Betrag wurde zwischen den Konten umgebucht:",
    },
    number: "Beleg-/Buchungsnr.",
    date: "Datum",
    amount: "Betrag",
    amountInWords: "in Worten",
    payer: "Eingezahlt von",
    payee: "Empfänger",
    purpose: "Verwendungszweck",
    account: "Konto",
    transfer: "Umbuchung",
    category: "Kategorie",
    project: "Projekt",
    receiptReference: "Externe Beleg-Nr.",
    reversed: (reason) => `STORNIERT${reason ? ` – ${reason}` : ""}`,
    signatureReceiver: "Unterschrift Empfänger",
    signaturePayer: "Unterschrift Einzahler",
    signatureTreasurer: "Unterschrift Kassenwart",
    placeDate: "Ort, Datum",
    listTitle: "EINNAHMEN- UND AUSGABENLISTE",
    listPeriod: (year) => `Geschäftsjahr ${year}`,
    colDate: "Datum",
    colNumber: "Buchungsnr.",
    colType: "Art",
    colDescription: "Beschreibung",
    colCategory: "Kategorie",
    colAccount: "Konto",
    colIncome: "Einnahme",
    colExpense: "Ausgabe",
    typeLabels: { INCOME: "Einnahme", EXPENSE: "Ausgabe", TRANSFER: "Umbuchung" },
    totals: "Summe",
    balance: "Überschuss / Fehlbetrag",
    truncated: (max) => `Hinweis: Nur die ersten ${max} Buchungen sind enthalten.`,
    invoiceTitle: "RECHNUNG",
    proformaTitle: "PROFORMA-RECHNUNG",
    quoteTitle: "ANGEBOT",
    quoteNumber: "Angebots-Nr.",
    quoteNote: "Dieses Angebot ist freibleibend. Wir freuen uns auf Ihren Auftrag.",
    cancelledStamp: "STORNIERT",
    invoiceNumber: "Rechnungsnr.",
    proformaNumber: "Proforma-Nr.",
    draftNumber: "ENTWURF",
    issueDate: "Rechnungsdatum",
    serviceDate: "Leistungsdatum/-zeitraum",
    dueDate: "Zahlbar bis",
    recipient: "Rechnungsempfänger",
    colPos: "Pos.",
    colItem: "Bezeichnung",
    colQty: "Menge",
    colUnitPrice: "Einzelpreis",
    colTax: "USt.",
    colTotal: "Gesamt",
    net: "Nettobetrag",
    taxLine: (rate) => `zzgl. ${rate} % USt.`,
    gross: "Rechnungsbetrag",
    proformaNote: "Dies ist eine Proforma-Rechnung und keine Rechnung im Sinne des § 14 UStG. Sie berechtigt nicht zum Vorsteuerabzug.",
    paymentNote: (due, number) => `Bitte überweisen Sie den Betrag bis zum ${due} unter Angabe der Nummer ${number}.`,
    bank: "Bankverbindung",
    contact: "Kontakt",
    taxNumber: "Steuernummer",
    none: "–",
    footerPage: (page, total) => `Seite ${page} von ${total}`,
  },
  tr: {
    voucherTitle: { INCOME: "TAHSİLAT MAKBUZU (QUITTUNG)", EXPENSE: "ÖDEME BELGESİ (AUSZAHLUNGSBELEG)", TRANSFER: "VİRMAN BELGESİ (UMBUCHUNGSBELEG)" },
    voucherIntro: {
      INCOME: "Aşağıdaki tutarın tahsil edildiğini onaylarız:",
      EXPENSE: "Aşağıdaki tutar ödenmiştir:",
      TRANSFER: "Aşağıdaki tutar hesaplar arasında aktarılmıştır:",
    },
    number: "Fiş No",
    date: "Tarih",
    amount: "Tutar",
    amountInWords: "yazıyla (Almanca)",
    payer: "Ödeyen",
    payee: "Alıcı",
    purpose: "Açıklama",
    account: "Hesap",
    transfer: "Virman",
    category: "Kategori",
    project: "Proje",
    receiptReference: "Harici belge no",
    reversed: (reason) => `İPTAL EDİLDİ${reason ? ` – ${reason}` : ""}`,
    signatureReceiver: "Teslim alan imza",
    signaturePayer: "Ödeyen imza",
    signatureTreasurer: "Sayman imza",
    placeDate: "Yer, tarih",
    listTitle: "GELİR VE GİDER LİSTESİ",
    listPeriod: (year) => `Mali yıl ${year}`,
    colDate: "Tarih",
    colNumber: "Fiş No",
    colType: "Tür",
    colDescription: "Açıklama",
    colCategory: "Kategori",
    colAccount: "Hesap",
    colIncome: "Gelir",
    colExpense: "Gider",
    typeLabels: { INCOME: "Gelir", EXPENSE: "Gider", TRANSFER: "Virman" },
    totals: "Toplam",
    balance: "Fazla / eksik",
    truncated: (max) => `Not: Yalnızca ilk ${max} fiş listelenmiştir.`,
    invoiceTitle: "FATURA (RECHNUNG)",
    proformaTitle: "PROFORMA FATURA",
    quoteTitle: "TEKLİF (ANGEBOT)",
    quoteNumber: "Teklif No.",
    quoteNote: "Bu teklif bağlayıcı değildir. Siparişinizi bekleriz.",
    cancelledStamp: "İPTAL EDİLDİ",
    invoiceNumber: "Fatura No",
    proformaNumber: "Proforma No",
    draftNumber: "TASLAK",
    issueDate: "Fatura tarihi",
    serviceDate: "Hizmet tarihi/dönemi",
    dueDate: "Son ödeme tarihi",
    recipient: "Alıcı",
    colPos: "Sıra",
    colItem: "Açıklama",
    colQty: "Miktar",
    colUnitPrice: "Birim fiyat",
    colTax: "KDV",
    colTotal: "Toplam",
    net: "Net tutar",
    taxLine: (rate) => `+ %${rate} KDV (USt.)`,
    gross: "Fatura tutarı",
    proformaNote: "Bu bir proforma faturadır; § 14 UStG anlamında fatura değildir ve indirim hakkı doğurmaz.",
    paymentNote: (due, number) => `Lütfen tutarı ${due} tarihine kadar ${number} numarasını belirterek havale edin.`,
    bank: "Banka bilgileri",
    contact: "İletişim",
    taxNumber: "Vergi numarası",
    none: "—",
    footerPage: (page, total) => `Sayfa ${page} / ${total}`,
  },
};
