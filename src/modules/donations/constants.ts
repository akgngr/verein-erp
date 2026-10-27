import type {
  ConfirmationContent,
  ConfirmationItemType,
  ConfirmationKind,
  ConfirmationStatus,
  DonationMethod,
  DonorType,
} from "@prisma/client";

/** Faz 5 (§ 11 md. 1): numara biçimleri. */
export const DONOR_NUMBER_PREFIX = "SP"; // SP-0001 (yıl yok)
export const DONATION_NUMBER_PREFIX = "BG"; // BG-2026-0001
export const CONFIRMATION_NUMBER_PREFIX = "ZB"; // ZB-2026-0001

// Stand: 2026 – jährlich prüfen (README'de belirtilir).
/** 300 € altı bağışlar için resmi bildirim zorunlu değildir (uyarı, engel değil). */
export const SMALL_DONATION_LIMIT_CENTS = 30_000;

/** Bildirim nüshaları (Doppel) fiş olarak saklanır: yıl sonundan itibaren 8 yıl. */
export const CONFIRMATION_RETENTION_YEARS = 8;

/** Maksimum tutar (§ 10 Donation.amount üst sınırı): 9.999.999,99 €. */
export const MAX_DONATION_CENTS = 999_999_999;

/** Batch PDF: tek istekte en fazla 100 bildirim (§ 13). */
export const BATCH_PDF_MAX_IDS = 100;

/** Batch üretim: alıcı başına bir bildirim; hata akışı durdurmaz. */
export const BATCH_ISSUE_MAX_RECIPIENTS = 200;

/** Etiket sözlükleri (sunucu içi: audit/export/PDF TR satırları). */
export const DONOR_TYPE_LABELS: Record<DonorType, string> = {
  PERSON: "Kişi (Person)",
  ORGANIZATION: "Kuruluş (Organisation)",
};

export const DONATION_METHOD_LABELS: Record<DonationMethod, string> = {
  CASH: "Nakit (Bar)",
  BANK_TRANSFER: "Banka havalesi (Überweisung)",
  CARD: "Kart (Kartenzahlung)",
  PAYPAL: "PayPal",
  REIMBURSEMENT_WAIVER: "Aufwandsspende (gider vazgeçimi)",
  OTHER: "Diğer (Sonstige)",
};

/** KARAR (§ 11 md. 4): Aufwandsspende yöntemi ZORUNLU olarak REIMBURSEMENT_WAIVER. */
export const WAIVER_METHOD: DonationMethod = "REIMBURSEMENT_WAIVER";

export const CONFIRMATION_KIND_LABELS: Record<ConfirmationKind, string> = {
  SINGLE: "Einzelbestätigung (Tek)",
  COLLECTIVE: "Sammelbestätigung (Toplu)",
};

export const CONFIRMATION_CONTENT_LABELS: Record<ConfirmationContent, string> = {
  DONATION: "Geldspende (Bağış)",
  MEMBERSHIP_FEE: "Mitgliedsbeitrag (Aidat)",
};

export const CONFIRMATION_STATUS_LABELS: Record<ConfirmationStatus, string> = {
  ISSUED: "Düzenlendi",
  CANCELLED: "İptal edildi",
};

/** Bildirim ögesi etiketi (Anlage "Art der Zuwendung" kolonu; § 13 md. 13). */
export const ITEM_LABELS: Record<ConfirmationItemType, string> = {
  DONATION: "Geldspende",
  MEMBER_PAYMENT: "Mitgliedsbeitrag",
};

/** Excel dışa aktarım satır sınırı (§ 15 md. 9). */
export const DONATIONS_EXPORT_MAX_ROWS = 10_000;
