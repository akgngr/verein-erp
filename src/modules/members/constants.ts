import type { MemberDueStatus, MemberStatus, MembershipType } from "@prisma/client";

import type { ChipColor } from "@/shared/roles";

/** Üye modülü sabitleri: Türkçe etiketler, rozet renkleri, üyelik türleri. */

/** Üyelik numarası öneki: UYE-<yıl>-0001. */
export const MEMBERSHIP_NUMBER_PREFIX = "UYE";

/** Listede "Ad Soyad" hücresinin kırpılma uzunluğu (tam metin tooltip ile). */
export const NAME_TRUNCATE_LENGTH = 40;

/** Excel dışa aktarım satır sınırı (üyeler için). */
export const MEMBERS_EXPORT_MAX_ROWS = 10_000;

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  RESIGNED: "Ayrıldı",
  DECEASED: "Vefat",
};

export const MEMBER_STATUS_COLORS: Record<MemberStatus, ChipColor> = {
  ACTIVE: "success",
  PASSIVE: "warning",
  RESIGNED: "default",
  DECEASED: "danger",
};

export const MEMBER_STATUS_FILTER_OPTIONS = (
  Object.keys(MEMBER_STATUS_LABELS) as MemberStatus[]
).map((status) => ({ value: status, label: MEMBER_STATUS_LABELS[status] }));

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  ASIL: "Asıl",
  ONURSAL: "Onursal",
  FAHRI: "Fahri",
  DESTEKCI: "Destekçi",
};

export const MEMBERSHIP_TYPE_COLORS: Record<MembershipType, ChipColor> = {
  ASIL: "primary",
  ONURSAL: "secondary",
  FAHRI: "success",
  DESTEKCI: "warning",
};

export const MEMBERSHIP_TYPE_FILTER_OPTIONS = (
  Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[]
).map((type) => ({ value: type, label: MEMBERSHIP_TYPE_LABELS[type] }));

export const MEMBERSHIP_TYPE_SELECT_OPTIONS = (
  Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[]
).map((type) => ({ value: type, label: MEMBERSHIP_TYPE_LABELS[type] }));

// --- Faz 3 eklemeleri: aidat satırı, tür yönetimi, içe aktarma ---------------

/** Aidat raporu/satırı Excel dışa aktarım satır sınırı. */
export const DUES_EXPORT_MAX_ROWS = 10_000;

/** İçe aktarma sınırları (iş emri § 8). */
export const IMPORT_MAX_FILE_MB = 5;
export const IMPORT_MAX_ROWS = 2_000;

/** Aidat satırı durum etiketleri/renkleri. */
export const MEMBER_DUE_STATUS_LABELS: Record<MemberDueStatus, string> = {
  OPEN: "Açık",
  PARTIAL: "Kısmen",
  PAID: "Ödendi",
  WAIVED: "Muaf",
};

export const MEMBER_DUE_STATUS_COLORS: Record<MemberDueStatus, ChipColor> = {
  OPEN: "warning",
  PARTIAL: "secondary",
  PAID: "success",
  WAIVED: "default",
};

/**
 * Excel içe aktarmada "Üyelik Türü" hücresinin enum'a eşlenmesi.
 * KARAR: Yalnızca TR adları (kısa/uzun) + yaygın DE karşılıklar kabul edilir;
 * eşleşmeyen hücre satır hatasıdır ("Bilinmeyen üyelik türü"). Anahtarlar
 * normalize (küçük harf, tek boşluk) biçimdedir.
 */
export const IMPORT_TYPE_ALIASES: Record<string, MembershipType> = {
  "asil": "ASIL",
  "asil uye": "ASIL",
  "ordentlich": "ASIL",
  "ordentliches mitglied": "ASIL",
  "onursal": "ONURSAL",
  "onursal uye": "ONURSAL",
  "ehrenmitglied": "ONURSAL",
  "fahri": "FAHRI",
  "fahri uye": "FAHRI",
  "destekci": "DESTEKCI",
  "destekci uye": "DESTEKCI",
  "fordermitglied": "DESTEKCI",
  "foerdermitglied": "DESTEKCI",
};

/** İçe aktarmada "Durum" hücresinin enum'a eşlenmesi (Vefat içe aktarılmaz). */
export const IMPORT_STATUS_ALIASES: Record<string, "ACTIVE" | "PASSIVE" | "RESIGNED"> = {
  "aktif": "ACTIVE",
  "pasif": "PASSIVE",
  "askıda": "PASSIVE",
  "askida": "PASSIVE",
  "ayrıldı": "RESIGNED",
  "ayrildi": "RESIGNED",
};
