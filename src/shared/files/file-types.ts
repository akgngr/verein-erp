/**
 * Paylaşılan dosya türü kayıt defteri (Faz 2, 8. bölüm).
 *
 * KARAR: Faz 1'de documents/constants.ts içindeki kural listesi shared/files
 * altına taşındı; her iki modül de buradaki kayıt defterini kullanır.
 * Kural: uzantı → izinli MIME'lar → magic byte imza. SVG/HTML/JS ve
 * çalıştırılabilir türler YASAKTIR (kayıtta bilinçli olarak yer almazlar).
 */

export type FileSignatureKind = "pdf" | "png" | "jpeg" | "zip" | "ole" | "none";

export type FileTypeRule = {
  extensions: string[];
  /** Uzantıyla uyumlu kabul edilen MIME'lar (istemcinin bildirdiği değer). */
  mimes: string[];
  signature: FileSignatureKind;
};

/** İzinli dosya türleri ve eşleşme kuralları. */
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
  // KARAR: pptx Faz 2 ile eklendi (zip tabanlı; imza kontrolü zip ile aynıdır).
  {
    extensions: ["pptx"],
    mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    signature: "zip",
  },
  { extensions: ["txt"], mimes: ["text/plain"], signature: "none" },
  // E-fatura (XRechnung/ZUGFeRD XML). Yalnızca açıkça izin veren modüller kabul eder; hiçbir zaman inline sunulmaz.
  { extensions: ["xml"], mimes: ["application/xml", "text/xml"], signature: "none" },
];

/** Magic byte imzaları (dosyanın ilk baytları). */
export const MAGIC_SIGNATURE_BYTES: Record<Exclude<FileSignatureKind, "none">, readonly number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF-
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  zip: [0x50, 0x4b], // PK (docx/xlsx/odt/ods/pptx)
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

/** Tüm izinli uzantılar (kayıt defterindeki her kural). */
export const ALL_ALLOWED_EXTENSIONS: readonly string[] = FILE_TYPE_RULES.flatMap(
  (rule) => rule.extensions,
);
