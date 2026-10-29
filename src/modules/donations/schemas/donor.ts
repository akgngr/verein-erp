import { z } from "zod";

/**
 * Bağışçı doğrulama (§ 11 md. 2): türü bazlı zorunluluklar; PLZ kuralı
 * members/organization ile aynı; bağışçılar ASLA silinmez (pasif + anonimleştirme).
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const donorTypeSchema = z.enum(["PERSON", "ORGANIZATION"]);

const baseFields = {
  type: donorTypeSchema,
  firstName: emptyToNull(z.string().trim().max(60, "Ad en fazla 60 karakter olabilir.").nullable()),
  lastName: emptyToNull(z.string().trim().max(60, "Soyad en fazla 60 karakter olabilir.").nullable()),
  organizationName: emptyToNull(
    z.string().trim().max(120, "Kuruluş adı en fazla 120 karakter olabilir.").nullable(),
  ),
  street: emptyToNull(z.string().trim().max(120, "Straße en fazla 120 karakter olabilir.").nullable()),
  postalCode: emptyToNull(z.string().trim().max(10, "PLZ en fazla 10 karakter olabilir.").nullable()),
  city: emptyToNull(z.string().trim().max(120, "Şehir en fazla 120 karakter olabilir.").nullable()),
  country: emptyToNull(z.string().trim().max(60, "Ülke en fazla 60 karakter olabilir.").nullable()),
  email: emptyToNull(
    z.string().trim().max(120).email("Geçerli bir e-posta girin.").nullable(),
  ),
  phone: emptyToNull(z.string().trim().max(30, "Telefon en fazla 30 karakter olabilir.").nullable()),
  /** KARAR: üye bağlantısı ipucudur — veri kopyalanır, FK kurulmaz (§ 2). Formda alan yoktur (optional). */
  memberId: emptyToNull(z.string().trim().max(60).nullable()).optional(),
  note: emptyToNull(z.string().trim().max(500, "Not en fazla 500 karakter olabilir.").nullable()),
  /** Üyeden bağışçı oluşturma: ön doldurma bayrağı (veri bir kez kopyalanır). */
  copyFromMemberId: emptyToNull(z.string().trim().min(1).nullable()),
};

export const donorCreateSchema = z
  .object(baseFields)
  .superRefine((data, ctx) => {
    // § 11 md. 2: PERSON zorunlu lastName (1-60); ORGANIZATION zorunlu organizationName (2-120).
    if (data.type === "PERSON" && !data.lastName) {
      ctx.addIssue({ code: "custom", path: ["lastName"], message: "Kişi için soyad zorunludur." });
    }
    if (data.type === "ORGANIZATION" && (!data.organizationName || data.organizationName.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["organizationName"],
        message: "Kuruluş için ad (en az 2 karakter) zorunludur.",
      });
    }
    // PLZ kuralı: ülke boş veya Almanya → 5 hane.
    const country = (data.country ?? "").trim().toLowerCase();
    const isGermany = country === "" || country === "deutschland" || country === "germany" || country === "almanya";
    if (isGermany && data.postalCode !== null && !/^\d{5}$/.test(data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: "Almanya için posta kodu 5 haneli olmalıdır.",
      });
    }
  });

export const donorUpdateSchema = donorCreateSchema.extend({
  isActive: z.boolean().optional(),
});

export const donorListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: donorTypeSchema.optional(),
  active: z.enum(["1", "0"]).optional(),
});

/** Bağışçı anonimleştirme (§ 11 md. 12): numara ile onay zorunlu. */
export const donorAnonymizeSchema = z.object({
  id: z.string().min(1),
  confirmDonorNumber: z
    .string()
    .trim()
    .min(1, "Onay için bağışçı numarasını yazın (örn. SP-0007)."),
});

export type DonorCreateInput = z.infer<typeof donorCreateSchema>;
export type DonorUpdateInput = z.infer<typeof donorUpdateSchema>;
export type DonorAnonymizeInput = z.infer<typeof donorAnonymizeSchema>;
