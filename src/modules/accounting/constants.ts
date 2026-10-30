import type {
  AccountType,
  BookingType,
  CategoryDirection,
  PaymentMethod,
  Sphere,
} from "@prisma/client";

/**
 * Muhasebe sabitleri (Faz 4, § 5 + § 8). Plan of accounts SEED'dedir (§ 7);
 * burada yalnızca kod sabitleri + etiket sözlükleri yaşar (sunucu içi TR —
 * next-intl KARARI ile aynı desen: constants'taki etiketler PDF/Excel/audit
 * gibi sunucu içi yüzeyler için TR kalır; UI metinleri messages/*'dan gelir).
 */

// Stand: 2026 – jährlich prüfen (README'de de belirtilir).
/** Vergiye tabi ticari işletme brüt gelir sınırı (§ 64 Abs. 3 AO). */
export const ECONOMIC_OPERATION_LIMIT_CENTS = 5_000_000; // 50.000 €

/** Görev tazminatı yardım metni (§ 5) — kategori formunda gösterilir. */
export const ALLOWANCE_HINT_TEXT =
  "Ehrenamtspauschale bis 960 €/Jahr, Übungsleiterpauschale bis 3.300 €/Jahr je Person (Stand 2026). Kişi bazlı yıllık takip bu uygulamada yapılmaz.";

/** Fiş numarası öneki: B-<yıl>-0001. */
export const BOOKING_NUMBER_PREFIX = "B";

/** Excel dışa aktarım satır sınırı (§ 11.9). */
export const BOOKINGS_EXPORT_MAX_ROWS = 10_000;

/** Fiş başına en fazla aktif belge (§ 9). */
export const MAX_FILES_PER_BOOKING = 10;

/** Fiş dosyalarında izinli uzantılar (§ 9: pdf, jpg/jpeg, png). */
export const BOOKING_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"] as const;

/** İptal/açma gerekçeleri için ortak sınır (§ 8). */
export const REASON_MIN = 5;
export const REASON_MAX = 300;

/** Açıklama/karşı taraf/belge no sınırları (§ 8 md. 5). */
export const DESCRIPTION_MIN = 3;
export const DESCRIPTION_MAX = 300;

/** Etiket sözlükleri (sunucu içi; Excel + audit + PDF TR/DE akışı buradan beslenir). */
export const ACCOUNT_TYPE_VALUES: AccountType[] = ["CASH", "BANK", "OTHER"];

export const BOOKING_TYPE_VALUES: BookingType[] = ["INCOME", "EXPENSE", "TRANSFER"];

export const DIRECTION_VALUES: CategoryDirection[] = ["INCOME", "EXPENSE"];

export const SPHERE_VALUES: Sphere[] = ["IDEELL", "ASSET_MANAGEMENT", "PURPOSE_OPERATION", "ECONOMIC_OPERATION"];

export const SPHERE_ORDER: Sphere[] = [
  "IDEELL",
  "ASSET_MANAGEMENT",
  "PURPOSE_OPERATION",
  "ECONOMIC_OPERATION",
];

/** Üye ödeme yöntemi → hedef hesap anahtarı (§ 8 md. 15). */
export const PAYMENT_METHOD_ACCOUNT: Record<
  PaymentMethod,
  "cashAccountId" | "bankAccountId"
> = {
  CASH: "cashAccountId",
  BANK_TRANSFER: "bankAccountId",
  CARD: "bankAccountId",
  OTHER: "bankAccountId",
};

/** Kaynak etiketleri — fiş listesi/detay "Kaynak" kolonu (§ 6). */
export const SOURCE_TYPE_VALUES = ["MEMBER_PAYMENT", "DONATION", "DONATION_WAIVER", "COURSE_FEE"] as const;
