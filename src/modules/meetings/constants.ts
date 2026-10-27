import type {
  ActionItemStatus,
  AttendeeRole,
  AttendanceStatus,
  DecisionResult,
  MeetingStatus,
  MeetingType,
} from "@prisma/client";

import { ALL_ALLOWED_EXTENSIONS } from "@/shared/files/file-types";
import type { ChipColor } from "@/shared/roles";

/**
 * Toplantı modülü sabitleri: Türkçe etiketler, rozet renkleri, durum geçiş
 * haritası ve dosya limitleri — HEPSİ tek yerde (5. ve 6. bölüm).
 */

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  BOARD: "Yönetim Kurulu",
  GENERAL_ASSEMBLY: "Genel Kurul",
  COMMITTEE: "Komisyon",
  OTHER: "Diğer",
};

export const MEETING_TYPE_COLORS: Record<MeetingType, ChipColor> = {
  BOARD: "primary",
  GENERAL_ASSEMBLY: "secondary",
  COMMITTEE: "success",
  OTHER: "default",
};

export const MEETING_TYPE_FILTER_OPTIONS = (
  Object.keys(MEETING_TYPE_LABELS) as MeetingType[]
).map((type) => ({ value: type, label: MEETING_TYPE_LABELS[type] }));

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  PLANNED: "Planlandı",
  HELD: "Yapıldı",
  APPROVED: "Onaylandı",
  CANCELLED: "İptal edildi",
};

export const MEETING_STATUS_COLORS: Record<MeetingStatus, ChipColor> = {
  PLANNED: "warning",
  HELD: "primary",
  APPROVED: "success",
  CANCELLED: "danger",
};

export const MEETING_STATUS_FILTER_OPTIONS = (
  Object.keys(MEETING_STATUS_LABELS) as MeetingStatus[]
).map((status) => ({ value: status, label: MEETING_STATUS_LABELS[status] }));

export const ATTENDEE_ROLE_LABELS: Record<AttendeeRole, string> = {
  CHAIRPERSON: "Başkan",
  SECRETARY: "Sekreter",
  MEMBER: "Üye",
  GUEST: "Konuk",
};

export const ATTENDEE_ROLE_FILTER_OPTIONS = (
  Object.keys(ATTENDEE_ROLE_LABELS) as AttendeeRole[]
).map((role) => ({ value: role, label: ATTENDEE_ROLE_LABELS[role] }));

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  INVITED: "Davetli",
  PRESENT: "Katıldı",
  ABSENT_EXCUSED: "Mazeretli",
  ABSENT: "Katılmadı",
};

export const ATTENDANCE_COLORS: Record<AttendanceStatus, ChipColor> = {
  INVITED: "default",
  PRESENT: "success",
  ABSENT_EXCUSED: "warning",
  ABSENT: "danger",
};

export const DECISION_RESULT_LABELS: Record<DecisionResult, string> = {
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
  POSTPONED: "Ertelendi",
};

export const DECISION_RESULT_COLORS: Record<DecisionResult, ChipColor> = {
  ACCEPTED: "success",
  REJECTED: "danger",
  POSTPONED: "warning",
};

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  OPEN: "Açık",
  DONE: "Tamamlandı",
};

export const ACTION_ITEM_STATUS_COLORS: Record<ActionItemStatus, ChipColor> = {
  OPEN: "warning",
  DONE: "success",
};

/**
 * Durum geçiş haritası (5. bölüm md. 3): her hedeften duruma izin gereken
 * aksiyon; haritada olmayan her geçiş sunucuda reddedilir.
 */
export type MeetingStatusTransitionPermission = "update" | "approve";

export const MEETING_STATUS_TRANSITIONS: Record<
  MeetingStatus,
  Partial<Record<MeetingStatus, MeetingStatusTransitionPermission>>
> = {
  PLANNED: { HELD: "update", CANCELLED: "update" },
  HELD: { APPROVED: "approve" },
  APPROVED: { HELD: "approve" }, // yeniden açma; zorunlu gerekçe action tarafında istenir
  CANCELLED: { PLANNED: "update" },
};

/** Toplantı başına en fazla aktif dosya (7.3, Ekler). */
export const MAX_FILES_PER_MEETING = 20;

/**
 * Toplantı ekleri izinli türler: Faz 1 listesinin tamamı + pptx (8. bölüm).
 */
export const MEETING_ALLOWED_EXTENSIONS: readonly string[] = ALL_ALLOWED_EXTENSIONS;

/** Toplantı numarası öneki: TOP-<yıl>-<sıra>. */
export const MEETING_NUMBER_PREFIX = "TOP";

/** Liste başlığı kırpma uzunluğu (tam metin title ile gösterilir). */
export const TITLE_TRUNCATE_LENGTH = 60;
