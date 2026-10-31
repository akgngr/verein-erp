import type {
  AccountType,
  BookingType,
  CategoryDirection,
  PaymentMethod,
  Sphere,
} from "@prisma/client";

/** Muhasebe modülü tipleri (Faz 4). Tutarlar UI'da cent (number); kalıcılıkta Decimal. */

/** Fiş listesi satırı (§ 11.1). */
export type BookingListItem = {
  id: string;
  bookingNumber: string;
  type: BookingType;
  bookingDate: Date;
  accountName: string;
  /** TRANSFER için "A → B"; diğerinde null. */
  transferLine: string | null;
  categoryName: string | null;
  categorySphere: Sphere | null;
  project: string | null;
  amountCents: number;
  description: string;
  counterparty: string | null;
  receiptReference: string | null;
  fileCount: number;
  /** Belge koşulu: aktif dosya ≥1 VEYA TRANSFER VEYA kaynak fişi (§ 8 md. 14). */
  hasReceipt: boolean;
  reversedAt: string | null;
  reverseReason: string | null;
  /** KARAR: "el ile" | "üyelik aktarımı" — sourceType doluysa aktarım. */
  sourceType: string | null;
};

/** Fiş dosyası satırı. */
export type BookingFileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedByLabel: string;
  createdAt: Date;
};

/** Fiş detayı (§ 11.3). */
export type BookingDetail = BookingListItem & {
  year: number;
  sequence: number;
  accountId: string;
  counterAccountId: string | null;
  categoryId: string | null;
  projectId: string | null;
  createdAt: Date;
  createdById: string;
  createdByLabel: string;
  updatedByLabel: string | null;
  updatedAt: Date;
  files: BookingFileRow[];
  /** ACC-1: KDV oranı ve tutarları (amountCents brüttür). */
  taxRate: number;
  netCents: number;
  taxCents: number;
};

/** Hesap + bakiye çipi (§ 11.1). */
export type AccountBalance = {
  id: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  balanceCents: number;
};

/** Hesap seçenekleri (form). */
export type AccountOption = {
  id: string;
  name: string;
  type: AccountType;
  isActive: boolean;
};

/** Kategori seçenekleri (form; yön filtresiyle kullanılır). */
export type CategoryOption = {
  id: string;
  name: string;
  direction: CategoryDirection;
  sphere: Sphere;
  isActive: boolean;
  helpText: string | null;
  /** ACC-1: fiş formunda varsayılan KDV oranı. */
  defaultTaxRate: number;
};

/** Proje seçenekleri (form). */
export type ProjectOption = {
  id: string;
  name: string;
  isActive: boolean;
};

/** Muhasebe istatistikleri (§ 14). */
export type AccountingStats = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  missingReceiptCount: number;
  accountBalances: Array<{ accountId: string; name: string; balanceCents: number }>;
};

/** Üyelik aktarımı önizleme (§ 8 md. 15). */
export type MemberSyncPreview = {
  toImport: { count: number; totalCents: number };
  toReverse: { count: number; totalCents: number };
  skippedLockedYear: number;
  skippedBeforeOpening: number;
  conflicts: Array<{ receiptNumber: string; reason: string }>;
};

/** Üyelik aktarımı çalıştırma sonucu. */
export type MemberSyncResult = {
  createdCount: number;
  reversedCount: number;
  skippedCount: number;
  conflicts: Array<{ receiptNumber: string; reason: string }>;
};

/** Gelir-Gider tablosu satırı (§ 11.8 md. 1). */
export type IncomeExpenseRow = {
  sphere: Sphere;
  categoryId: string | null; // null = ara toplam satırı
  categoryName: string;
  direction: CategoryDirection;
  planCents: number;
  actualCents: number;
  previousYearCents: number;
};

/** EÜR raporu (§ 11.8 md. 1). */
export type IncomeExpenseReport = {
  year: number;
  rows: IncomeExpenseRow[];
  /** Ekonomik işletme uyarısı (§ 8 md. 17). */
  economicOperationIncomeCents: number;
  economicOperationNotice: "none" | "warning" | "exceeded";
};

/** Kasa defteri satırı (§ 11.8 md. 2). */
export type LedgerRow = {
  id: string;
  bookingNumber: string;
  bookingDate: Date;
  description: string;
  receiptReference: string | null;
  /** Tutar işaretli görünüm için tür + cent. */
  type: BookingType;
  amountCents: number;
  /** KRONOLOJİK YÜRÜYEN BAKİYE (iptaller hariç). */
  runningBalanceCents: number;
  reversedAt: string | null;
};

/** Kasa defteri raporu (§ 11.8 md. 2). */
export type LedgerReport = {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  from: string;
  to: string;
  openingBalanceCents: number;
  rows: LedgerRow[];
  closingBalanceCents: number;
};

/** Proje raporu satırı (§ 11.8 md. 3). */
export type ProjectReportRow = {
  projectId: string;
  projectName: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
};

/** Yıl kapanış tablosu satırı (§ 11.6). */
export type YearClosingRow = {
  year: number;
  bookingCount: number;
  incomeCents: number;
  expenseCents: number;
  missingReceiptCount: number;
  lockedAt: string | null;
  lockedByLabel: string | null;
};

/** Bütçe düzenleme satırı (§ 11.5). */
export type BudgetLineRow = {
  categoryId: string;
  categoryName: string;
  direction: CategoryDirection;
  sphere: Sphere;
  planCents: number | null;
  actualCents: number;
};

/** Ödeme yöntemi etiketi helper'ı — members modülü PaymentMethod; sunucu içi. */
export type PaymentMethodKey = PaymentMethod;
