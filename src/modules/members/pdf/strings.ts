/**
 * Makbuz PDF metinleri (Faz 4, 4.3): de VARSAYILAN, tr opsiyonel. Tek arayüz —
 * eksik çeviri DERLEME HATASIDIR.
 *
 * KARAR (4.3): Alt disclaimer HER dil sürümünde kendi dilinde basılır:
 * "Diese Quittung ist keine Zuwendungsbestätigung im Sinne des § 10b EStG."
 * / "Bu makbuz, § 10b EStG anlamında bir bağış/aidat vergi belgesi
 * (Zuwendungsbestätigung) değildir."
 */

export type ReceiptStrings = {
  headerTitle: string;
  /** "<name> (<memberNo>) hat den Mitgliedsbeitrag für das Jahr <year> in Höhe von <amount> gezahlt." */
  bodyLine: (name: string, memberNo: string, year: number, amount: string) => string;
  /** Etiketler */
  labelReceiptNumber: string;
  labelMethod: string;
  labelPaidAt: string;
  labelReference: string;
  voidedMark: string;
  voidedLine: (date: string, reason: string) => string;
  disclaimer: string;
  methodLabels: Record<"CASH" | "BANK_TRANSFER" | "CARD" | "OTHER", string>;
  none: string;
};

export const RECEIPT_STRINGS: { de: ReceiptStrings; tr: ReceiptStrings } = {
  de: {
    headerTitle: "QUITTUNG ÜBER MITGLIEDSBEITRAG",
    bodyLine: (name, memberNo, year, amount) =>
      `${name} (Mitglied-Nr. ${memberNo}) hat den Mitgliedsbeitrag für das Jahr ${year} in Höhe von ${amount} gezahlt.`,
    labelReceiptNumber: "Quittungs-Nr.",
    labelMethod: "Zahlungsart",
    labelPaidAt: "Zahlungsdatum",
    labelReference: "Referenz",
    voidedMark: "STORNIERT",
    voidedLine: (date, reason) => `Storniert am ${date} — Grund: ${reason}`,
    disclaimer:
      "Diese Quittung ist keine Zuwendungsbestätigung im Sinne des § 10b EStG.",
    methodLabels: {
      CASH: "Bar",
      BANK_TRANSFER: "Überweisung",
      CARD: "Kartenzahlung",
      OTHER: "Sonstige",
    },
    none: "–",
  },
  tr: {
    headerTitle: "ÜYELİK AİDATI MAKBUZU",
    bodyLine: (name, memberNo, year, amount) =>
      `${name} (Üye No. ${memberNo}), ${year} yılı üyelik aidatı olarak ${amount} tutarını ödemiştir.`,
    labelReceiptNumber: "Makbuz No",
    labelMethod: "Ödeme yöntemi",
    labelPaidAt: "Ödeme tarihi",
    labelReference: "Referans",
    voidedMark: "İPTAL EDİLDİ",
    voidedLine: (date, reason) => `İptal tarihi: ${date} — Neden: ${reason}`,
    disclaimer:
      "Bu makbuz, § 10b EStG anlamında bir bağış/aidat vergi belgesi (Zuwendungsbestätigung) değildir.",
    methodLabels: {
      CASH: "Nakit (Bar)",
      BANK_TRANSFER: "Banka havalesi (Überweisung)",
      CARD: "Kart (Kartenzahlung)",
      OTHER: "Diğer (Sonstige)",
    },
    none: "—",
  },
};
