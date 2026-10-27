import type {
  MemberDueStatus,
  MemberStatus,
  MembershipType,
  PaymentMethod,
} from "@prisma/client";

/**
 * Üye modülü satır/detay tipleri.
 *
 * KARAR (Verein pivotu): tcKimlikNo alanı "kimlikNo" olarak yeniden adlandırıldı —
 * serbest metin (Mitgliedsnummer/Steuer-ID/ehliyet no/uyruk no), DB düzeyinde
 * unique değildir. Yine de role göre maskelenir: VIEWER yanıtta HİÇ GÖREMEZ
 * (services/kimlik.ts); ADMIN/BOARD/SECRETARY tam görür.
 * Adres alanları Alman adres yapısına göre yapılandırıldı (street/houseNumber/
 * postalCode/city/state); detay sayfasında formatAddress ile birleştirilir.
 */

/** Liste satırı. */
export type MemberListItem = {
  id: string;
  membershipNumber: string;
  type: MembershipType;
  status: MemberStatus;
  firstName: string;
  lastName: string;
  /** Görüntüleme için birleştirilmiş tam ad. */
  fullName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  joinDate: Date;
  exitDate: Date | null;
  /** Faz 4 (4.6): ülke. */
  country: string | null;
};

/** Detay sayfası not satırı. */
export type MemberNoteItem = {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: Date;
};

/** Detay sayfası verisi — get-member çıktısı. kimlikNo yalnızca yetkili rollerde gelir. */
export type MemberDetail = {
  id: string;
  membershipNumber: string;
  type: MembershipType;
  status: MemberStatus;
  firstName: string;
  lastName: string;
  fullName: string;
  kimlikNo: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  /** Faz 4 (4.6): ülke — PLZ kuralı buna bağlıdır. */
  country: string | null;
  /** Faz 4 (4.6): fesih bildirimi tarihi (Kündigung eingegangen am). */
  cancellationReceivedAt: Date | null;
  /** Birleştirilmiş adres görüntüleme metni ("Straße Hausnr, PLZ Stadt (Bundesland)"). */
  addressFormatted: string | null;
  birthDate: Date | null;
  profession: string | null;
  joinDate: Date;
  exitDate: Date | null;
  exitReason: string | null;
  notes: string | null;
  createdById: string;
  createdByLabel: string;
  createdAt: Date;
  updatedById: string | null;
  updatedByLabel: string | null;
  updatedAt: Date;
  memberNotes: MemberNoteItem[];
};

/** Üye detay ödeme paneli satırı (Faz 4, 4.6). */
export type PaymentRow = {
  id: string;
  receiptNumber: string;
  dueYear: number;
  amountCents: number;
  method: PaymentMethod;
  /** YYYY-MM-DD */
  paidAt: string;
  reference: string | null;
  voidedAt: string | null;
  voidReason: string | null;
};

/** Panel + liste üstü istatistik kartları. */
export type MemberStats = {
  active: number;
  passive: number;
  resigned: number;
  newThisMonth: number;
  byType: { type: MembershipType; count: number }[];
};

// --- Faz 3 eklemeleri: aidat satırı, tür yönetimi, içe aktarma ---------------

/** Üye detay aidat satırı (DuesPanel). */
export type DueRow = {
  id: string;
  year: number;
  amountDueCents: number;
  paidCents: number;
  remainingCents: number;
  status: MemberDueStatus;
  /** YYYY-MM-DD */
  dueDate: string;
  note: string | null;
  /** dueDate < bugün (Europe/Berlin) ve durumu PAID/WAIVED değil. */
  overdue: boolean;
};

/** Aidat raporu satırı (cross-member). */
export type DuesReportRow = {
  id: string;
  memberId: string;
  membershipNumber: string;
  fullName: string;
  type: MembershipType;
  year: number;
  amountDueCents: number;
  paidCents: number;
  remainingCents: number;
  status: MemberDueStatus;
  /** YYYY-MM-DD */
  dueDate: string;
  overdue: boolean;
  /** Son geçerli (void edilmemiş) ödemenin tarihi; ödeme yoksa null. */
  lastPaymentAt: string | null;
};

/** Aidat raporu istatistikleri. */
export type DuesStats = {
  year: number;
  expectedCents: number;
  collectedCents: number;
  remainingCents: number;
  /** 0-100; beklenen 0 ise null. */
  collectionRate: number | null;
  openCount: number;
  partialCount: number;
  paidCount: number;
  waivedCount: number;
  overdueCount: number;
};

/** Üyelik türü konfigürasyon satırı (türler ekranı). */
export type MemberTypeConfigRow = {
  type: MembershipType;
  /** null = henüz belirlenmedi (aidat üretimi bu türü atlar). */
  annualDueCents: number | null;
  isActive: boolean;
  memberCount: number;
};

/** İçe aktarma satır hatası. */
export type ImportRowError = { row: number; messages: string[] };

/** dry-run (kontrol) sonucu. */
export type ImportPreviewData = {
  total: number;
  valid: number;
  errors: ImportRowError[];
};

/** commit (içe aktarım) sonucu. */
export type ImportCommitData = {
  total: number;
  valid: number;
  imported: number;
  errors: ImportRowError[];
};
