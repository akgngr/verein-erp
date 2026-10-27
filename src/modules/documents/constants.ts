import type { DeliveryMethod, DocumentDirection, DocumentStatus } from "@prisma/client";

import { ALL_ALLOWED_EXTENSIONS, INLINE_PREVIEW_EXTENSIONS } from "@/shared/files/file-types";
import type { ChipColor } from "@/shared/roles";

// Önizlenebilir türler shared/files'tan gelir; documents/index.ts buradan yeniden dışa aktarır.
export { INLINE_PREVIEW_EXTENSIONS };

/**
 * Evrak modülü sabitleri: Türkçe etiketler, rozet renkleri, izinli dosya türleri,
 * limitler ve kayıt numarası önekleri — HEPSİ tek yerde (7. bölüm).
 */

/** Kayıt numarası önekleri: GLN (gelen) / GDN (giden). */
export const REGISTRY_PREFIX: Record<DocumentDirection, string> = {
  INCOMING: "GLN",
  OUTGOING: "GDN",
};

export const DIRECTION_LABELS: Record<DocumentDirection, string> = {
  INCOMING: "Gelen",
  OUTGOING: "Giden",
};

export const DIRECTION_COLORS: Record<DocumentDirection, ChipColor> = {
  INCOMING: "primary",
  OUTGOING: "secondary",
};

export const DIRECTION_FILTER_OPTIONS = [
  { value: "INCOMING", label: "Gelen" },
  { value: "OUTGOING", label: "Giden" },
] as const;

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  COMPLETED: "Tamamlandı",
  ARCHIVED: "Arşivlendi",
};

export const STATUS_COLORS: Record<DocumentStatus, ChipColor> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  ARCHIVED: "default",
};

export const STATUS_FILTER_OPTIONS = (Object.keys(STATUS_LABELS) as DocumentStatus[]).map(
  (status) => ({ value: status, label: STATUS_LABELS[status] }),
);

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  POST: "Posta",
  EMAIL: "E-posta",
  HAND: "Elden",
  COURIER: "Kargo/Kurye",
  REGISTERED_MAIL: "Kayıtlı Posta",
  FAX: "Faks",
  OTHER: "Diğer",
};

export const DELIVERY_METHOD_OPTIONS = (Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map(
  (method) => ({ value: method, label: DELIVERY_METHOD_LABELS[method] }),
);

/** Durum seçenekleri: varsayılanlar form tarafında yön'e göre seçilir (5. bölüm md. 2). */
export const DEFAULT_STATUS_BY_DIRECTION: Record<DocumentDirection, DocumentStatus> = {
  INCOMING: "OPEN",
  OUTGOING: "COMPLETED",
};

/**
 * KARAR (Faz 2, 8. bölüm): dosya türü kuralları shared/files/file-types.ts'e taşındı.
 * Evrak modülünün izin verdiği alt küme Faz 1 davranışıyla birebir aynı kalır:
 * pptx YOKTUR (yalnızca toplantılar kabul eder).
 */
export const ALLOWED_EXTENSIONS: readonly string[] = ALL_ALLOWED_EXTENSIONS.filter(
  (extension) => extension !== "pptx",
);

/** Evrak başına en fazla aktif dosya (7. bölüm). */
export const MAX_FILES_PER_DOCUMENT = 10;

/** Excel dışa aktarım satır sınırı (10. bölüm). */
export const EXPORT_MAX_ROWS = 10_000;

/** Listede "Konu" hücresinin kırpılma uzunluğu (tam metin title ile gösterilir). */
export const SUBJECT_TRUNCATE_LENGTH = 60;
