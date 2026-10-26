import type { DeliveryMethod, DocumentDirection, DocumentStatus } from "@prisma/client";

import type { ChipColor } from "@/shared/roles";

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
  KEP: "KEP",
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

/** Dosya imzası (magic bytes) kontrol türleri; "none" = imza kontrolü yok (txt). */
export type FileSignatureKind = "pdf" | "png" | "jpeg" | "zip" | "ole" | "none";

export type FileTypeRule = {
  extensions: string[];
  /** Uzantıyla uyumlu kabul edilen MIME'lar (istemcinin bildirdiği değer). */
  mimes: string[];
  signature: FileSignatureKind;
};

/** İzinli dosya türleri ve eşleşme kuralları (7. bölüm). SVG/HTML/JS/çalıştırılabilir YASAK. */
export const FILE_TYPE_RULES: FileTypeRule[] = [
  { extensions: ["pdf"], mimes: ["application/pdf"], signature: "pdf" },
  { extensions: ["jpg", "jpeg"], mimes: ["image/jpeg", "application/jpeg"], signature: "jpeg" },
  { extensions: ["png"], mimes: ["image/png", "application/png"], signature: "png" },
  { extensions: ["doc"], mimes: ["application/msword"], signature: "ole" },
  {
    extensions: ["docx"],
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    signature: "zip",
  },
  { extensions: ["xls"], mimes: ["application/vnd.ms-excel"], signature: "ole" },
  {
    extensions: ["xlsx"],
    mimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    signature: "zip",
  },
  { extensions: ["odt"], mimes: ["application/vnd.oasis.opendocument.text"], signature: "zip" },
  {
    extensions: ["ods"],
    mimes: ["application/vnd.oasis.opendocument.spreadsheet"],
    signature: "zip",
  },
  { extensions: ["txt"], mimes: ["text/plain"], signature: "none" },
];

export const ALLOWED_EXTENSIONS: readonly string[] = FILE_TYPE_RULES.flatMap(
  (rule) => rule.extensions,
);

/** Magic byte imzaları (dosyanın ilk baytları). */
export const MAGIC_SIGNATURE_BYTES: Record<Exclude<FileSignatureKind, "none">, readonly number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF-
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  zip: [0x50, 0x4b], // PK (docx/xlsx/odt/ods)
  ole: [0xd0, 0xcf, 0x11, 0xe0], // doc/xls
};

/**
 * KARAR: İşletim sistemi/tarayıcıya göre ZIP tabanlı ofis belgeleri için MIME
 * "application/octet-stream" veya "application/zip" olarak bildirilebilir; bu
 * genel değerler uzantıyla uyumlu sayılır. Asıl güvenlik kapısı magic byte
 * kontrolüdür — uyumsuz imza her koşulda reddedilir.
 */
export const GENERIC_MIME_FALLBACKS: readonly string[] = [
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
];

/** Tarayıcıda önizlenebilen (inline) türler; indirme her tür için mümkündür. */
export const INLINE_PREVIEW_EXTENSIONS: readonly string[] = ["pdf", "jpg", "jpeg", "png"];

/** Evrak başına en fazla aktif dosya (7. bölüm). */
export const MAX_FILES_PER_DOCUMENT = 10;

/** Excel dışa aktarım satır sınırı (10. bölüm). */
export const EXPORT_MAX_ROWS = 10_000;

/** Listede "Konu" hücresinin kırpılma uzunluğu (tam metin title ile gösterilir). */
export const SUBJECT_TRUNCATE_LENGTH = 60;
