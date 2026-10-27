import type {
  ConfirmationContent,
  ConfirmationKind,
  ConfirmationStatus,
  DonationMethod,
  DonorType,
} from "@prisma/client";

/** Faz 5 modül tipleri. Tutarlar UI'da string/cent; kalıcılıkta Decimal(12,2). */

/** Bağışçı liste satırı (§ 15 md. 4). */
export type DonorListItem = {
  id: string;
  donorNumber: number;
  type: DonorType;
  /** Kişi: "Soyad, Ad"; kuruluş: organizationName. */
  displayName: string;
  city: string | null;
  isActive: boolean;
  isAnonymized: boolean;
  donationCount: number;
  totalCents: number;
};

/** Bağışçı detayı (§ 15 md. 4). */
export type DonorDetail = DonorListItem & {
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  street: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  memberId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Aktif bildirim nüsha saklama süresi içinde mi (anonimleştirme engeli). */
  retentionBlocked: boolean;
};

/** Bağış liste satırı (§ 15 md. 1). */
export type DonationListItem = {
  id: string;
  donationNumber: string;
  receivedAt: Date;
  donorId: string;
  donorNumber: number;
  donorName: string;
  amountCents: number;
  method: DonationMethod;
  waivedReimbursement: boolean;
  /** ZB numarası (aktif), null = yok; cancelled = iptal bildirimde. */
  confirmationNumber: string | null;
  confirmationCancelled: boolean;
  bookingNumber: string | null;
  reversedAt: string | null;
};

/** Bağış detayı (§ 15 md. 3). */
export type DonationDetail = DonationListItem & {
  year: number;
  sequence: number;
  reference: string | null;
  purposeNote: string | null;
  claimBasis: string | null;
  waiverDeclaredAt: Date | null;
  expenseCategoryId: string | null;
  waiverBookingNumber: string | null;
  reverseReason: string | null;
  /** Aktif bildirim ögesi var mı (düzenleme/iptal engeli). */
  hasActiveConfirmationItem: boolean;
  createdById: string;
  createdByLabel: string;
  createdAt: Date;
  updatedByLabel: string | null;
  updatedAt: Date;
};

/** Bildirim liste satırı (§ 15 md. 5). */
export type ConfirmationListItem = {
  id: string;
  confirmationNumber: string;
  issuedAt: Date;
  kind: ConfirmationKind;
  content: ConfirmationContent;
  recipientName: string;
  totalCents: number;
  status: ConfirmationStatus;
  /** void edilmiş ödeme uyarısı var mı (§ 11 md. 11). */
  voidedPaymentWarning: boolean;
};

/** Bildirim detayı (§ 15 md. 7). */
export type ConfirmationDetail = ConfirmationListItem & {
  year: number;
  sequence: number;
  donorNumber: number | null;
  memberId: string | null;
  recipientStreet: string;
  recipientPostalCode: string;
  recipientCity: string;
  recipientCountry: string | null;
  periodFrom: Date;
  periodTo: Date;
  amountInWords: string;
  waivedReimbursement: boolean;
  issuerSnapshot: Record<string, unknown>;
  templateVersion: string;
  issuedPlace: string;
  issuedByLabel: string;
  cancelledAt: Date | null;
  cancelledByLabel: string | null;
  cancelReason: string | null;
  replacesId: string | null;
  replacedById: string | null;
  pdfStoragePath: string | null;
  pdfSha256: string | null;
  pdfSize: number | null;
  items: Array<{
    id: string;
    position: number;
    itemType: "DONATION" | "MEMBER_PAYMENT";
    sourceId: string;
    itemDate: Date;
    amountCents: number;
    label: string;
    waived: boolean;
  }>;
  /** MEMBER_PAYMENT ögelerinin void durumu (§ 11 md. 11). */
  voidedPayments: Array<{ sourceId: string; receiptNumber: string }>;
  retentionEndDate: Date | null;
};

/** Bildirim üretim adayı (§ 15 md. 6 candidate-picker). */
export type ConfirmationCandidate = {
  sourceId: string;
  itemDate: Date;
  amountCents: number;
  label: string;
  waived: boolean;
  /** Bağış: BG numarası; aidat: makbuz numarası. */
  sourceNumber: string;
};

/** Hazır olma denetimi (§ 15 md. 8). */
export type ReadinessItem = {
  key: string;
  ok: boolean;
  label: string;
  /** Düzeltme bağlantısı (eksikse). */
  fixHref: string | null;
  /** Muafiyet geçerlilik: kalan gün (uyarı 90 gün öncesi). */
  daysRemaining: number | null;
};

export type ReadinessReport = {
  canIssueDonation: boolean;
  canIssueMembershipFee: boolean;
  items: ReadinessItem[];
};

/** Bağış istatistikleri (§ 17). */
export type DonationStats = {
  totalCents: number;
  count: number;
  unconfirmedOver300Count: number;
  issuedConfirmationCount: number;
  warningConfirmationCount: number;
};

/** Ayarlar (§ 14). */
export type DonationsSettingsData = {
  templateConfirmedVersion: string | null;
  templateConfirmedAt: Date | null;
  templateConfirmedByLabel: string | null;
};
