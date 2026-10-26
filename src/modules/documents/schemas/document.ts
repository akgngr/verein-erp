import { z } from "zod";

/**
 * Evrak doğrulama şemaları (5. bölüm md. 10).
 *
 * KARAR: Tarih alanları "YYYY-MM-DD" string taşır (FormDatePicker çıktısı);
 * sunucu tarafında UTC gece yarısı Date'e çevrilir (bkz. utils.parseDateOnly).
 * Kayıt numarası (registryNumber) ve update'te yön (direction) bu şemalarda
 * YOKTUR — numara üretimi ve yön sunucuda belirlenir, API üzerinden gönderilse
 * de yok sayılır (5. bölüm md. 1).
 */

/** Boş (yalnızca boşluklu) string'leri null'a çevirir (5. bölüm md. 10). */
function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const documentDateSchema = z
  .string()
  .trim()
  .min(1, "Evrak tarihi zorunludur.")
  .regex(DATE_ONLY, "Geçerli bir evrak tarihi girin.");

const statusSchema = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);

const baseFields = {
  documentDate: documentDateSchema,
  counterparty: z
    .string()
    .trim()
    .min(2, "Gönderen/Alıcı en az 2 karakter olmalıdır.")
    .max(200, "Gönderen/Alıcı en fazla 200 karakter olabilir."),
  referenceNumber: emptyToNull(
    z.string().trim().max(100, "Evrak sayısı en fazla 100 karakter olabilir.").nullable(),
  ),
  subject: z
    .string()
    .trim()
    .min(3, "Konu en az 3 karakter olmalıdır.")
    .max(300, "Konu en fazla 300 karakter olabilir."),
  summary: emptyToNull(
    z.string().trim().max(2000, "Özet en fazla 2000 karakter olabilir.").nullable(),
  ),
  deliveryMethod: emptyToNull(z.enum(["POST", "EMAIL", "HAND", "COURIER", "KEP", "OTHER"]).nullable()),
  status: statusSchema.optional(),
  dueDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "Geçerli bir son işlem tarihi girin.").nullable(),
  ),
  categoryId: emptyToNull(z.string().trim().min(1).nullable()),
  assigneeId: emptyToNull(z.string().trim().min(1).nullable()),
  replyToId: emptyToNull(z.string().trim().min(1).nullable()),
};

/** dueDate verilmişse documentDate'ten önce olamaz (5. bölüm md. 10). */
function refineDueDate<Data extends { dueDate: string | null; documentDate: string }>(
  data: Data,
  ctx: z.RefinementCtx,
): void {
  if (!data.dueDate) return;
  // YYYY-MM-DD biçimli stringlerde sözlüksel karşılaştırma tarihsel karşılaştırmaya denktir.
  if (data.dueDate < data.documentDate) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Son işlem tarihi evrak tarihinden önce olamaz.",
    });
  }
}

export const documentCreateSchema = z
  .object({
    ...baseFields,
    direction: z.enum(["INCOMING", "OUTGOING"]),
  })
  .superRefine(refineDueDate);

export const documentUpdateSchema = z
  .object({
    ...baseFields,
    /** Eşzamanlılık koruması (5. bölüm md. 6): formun taşıdığı kaydın updatedAt'i. */
    updatedAt: z.string().min(1, "Kayıt sürümü eksik."),
  })
  .superRefine(refineDueDate);

export const changeStatusSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
});

export const deleteDocumentSchema = z.object({
  id: z.string().min(1),
});

export const deleteFileSchema = z.object({
  fileId: z.string().min(1),
});

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
