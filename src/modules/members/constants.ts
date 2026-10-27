import type { MemberStatus, MembershipType } from "@prisma/client";

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
