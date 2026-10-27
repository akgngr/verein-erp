import { z } from "zod";

/**
 * Üye doğrulama şemaları (Verein pivotu).
 *
 * KARAR: Tarih alanları "YYYY-MM-DD" string taşır (FormDatePicker çıktısı);
 * sunucu tarafında UTC gece yarısı Date'e çevrilir (bkz. utils.parseDateOnly).
 * Üyelik numarası ve sıra şemada YOKTUR — sunucuda üretilir, API üzerinden
 * gönderilse de yok sayılır. kimlikNo opsiyonel serbest metindir (max 60) —
 * Mitgliedsnummer/Steuer-ID/ehliyet no/uyruk no/pasaport no için.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const PHONE = /^[\d\s+()-]{7,20}$/;

const baseFields = {
  type: z.enum(["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"]),
  firstName: z
    .string()
    .trim()
    .min(2, "Ad en az 2 karakter olmalıdır.")
    .max(60, "Ad en fazla 60 karakter olabilir."),
  lastName: z
    .string()
    .trim()
    .min(2, "Soyad en az 2 karakter olmalıdır.")
    .max(60, "Soyad en fazla 60 karakter olabilir."),
  kimlikNo: emptyToNull(
    z
      .string()
      .trim()
      .max(60, "Kimlik no en fazla 60 karakter olabilir.")
      .nullable(),
  ),
  email: emptyToNull(
    z
      .string()
      .trim()
      .max(120, "E-posta en fazla 120 karakter olabilir.")
      .email("Geçerli bir e-posta girin.")
      .nullable(),
  ),
  phone: emptyToNull(
    z
      .string()
      .trim()
      .max(30, "Telefon en fazla 30 karakter olabilir.")
      .regex(PHONE, "Geçerli bir telefon girin.")
      .nullable(),
  ),
  // Alman adres alanları — her biri opsiyonel; en azından street veya city önerilir.
  street: emptyToNull(
    z.string().trim().max(120, "Straße/Sokak en fazla 120 karakter olabilir.").nullable(),
  ),
  houseNumber: emptyToNull(
    z.string().trim().max(20, "Kapı no en fazla 20 karakter olabilir.").nullable(),
  ),
  // Faz 4 (4.6): Ülke alanı eklendi; PLZ kuralı ülkeye bağlıdır (refinePostalCode).
  country: emptyToNull(
    z.string().trim().max(60, "Ülke en fazla 60 karakter olabilir.").nullable(),
  ),
  postalCode: emptyToNull(
    z
      .string()
      .trim()
      .max(10, "PLZ/Posta kodu en fazla 10 karakter olabilir.")
      .nullable(),
  ),
  city: emptyToNull(
    z.string().trim().max(120, "Şehir/Ort en fazla 120 karakter olabilir.").nullable(),
  ),
  state: emptyToNull(
    z.string().trim().max(120, "Bundesland/Eyalet/İl en fazla 120 karakter olabilir.").nullable(),
  ),
  birthDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "Geçerli bir doğum tarihi girin.").nullable(),
  ),
  profession: emptyToNull(
    z.string().trim().max(100, "Meslek en fazla 100 karakter olabilir.").nullable(),
  ),
  joinDate: z
    .string()
    .trim()
    .min(1, "Katılım tarihi zorunludur.")
    .regex(DATE_ONLY, "Geçerli bir katılım tarihi girin."),
  exitDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "Geçerli bir ayrılış tarihi girin.").nullable(),
  ),
  exitReason: emptyToNull(
    z.string().trim().max(500, "Ayrılış nedeni en fazla 500 karakter olabilir.").nullable(),
  ),
  notes: emptyToNull(
    z.string().trim().max(2000, "Notlar en fazla 2000 karakter olabilir.").nullable(),
  ),
};

/** Faz 4 (4.6): Ülke boş veya Almanya ise PLZ 5 haneli olmalıdır; aksi halde serbest ≤10. */
function refinePostalCode<
  Data extends { country: string | null; postalCode: string | null },
>(data: Data, ctx: z.RefinementCtx): void {
  const isGermany =
    data.country === null ||
    data.country === "" ||
    /^(deutschland|germany|almanya)$/i.test(data.country.trim());
  if (isGermany && data.postalCode && !/^\d{5}$/.test(data.postalCode)) {
    ctx.addIssue({
      code: "custom",
      path: ["postalCode"],
      message: "Almanya için posta kodu 5 haneli olmalıdır.",
    });
  }
}

/** exitDate verilmişse joinDate'ten önce olamaz; exitReason verilmişse exitDate de verilmeli. */
function refineMemberDates<
  Data extends { joinDate: string; exitDate: string | null; exitReason?: string | null },
>(data: Data, ctx: z.RefinementCtx): void {
  if (data.exitDate && data.exitDate < data.joinDate) {
    ctx.addIssue({
      code: "custom",
      path: ["exitDate"],
      message: "Ayrılış tarihi katılım tarihinden önce olamaz.",
    });
  }
  if (data.exitReason && !data.exitDate) {
    ctx.addIssue({
      code: "custom",
      path: ["exitDate"],
      message: "Ayrılış nedeni verilmişse ayrılış tarihi de girin.",
    });
  }
}

export const memberCreateSchema = z
  .object({ ...baseFields, status: z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"]).optional() })
  .superRefine((data, ctx) => {
    refineMemberDates(data, ctx);
    refinePostalCode(data, ctx);
  });

export const memberUpdateSchema = z
  .object({
    ...baseFields,
    status: z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"]),
    /** Eşzamanlılık koruması: formun taşıdığı kaydın updatedAt'i. */
    updatedAt: z.string().min(1, "Kayıt sürümü eksik."),
  })
  .superRefine((data, ctx) => {
    refineMemberDates(data, ctx);
    refinePostalCode(data, ctx);
  });

export const changeStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"]),
  exitDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "Geçerli bir ayrılış tarihi girin.").nullable(),
  ).optional(),
  exitReason: emptyToNull(
    z.string().trim().max(500, "Ayrılış nedeni en fazla 500 karakter olabilir.").nullable(),
  ).optional(),
  // Faz 4 (4.6): fesih bildirimi tarihi — RESIGNED'e geçişte opsiyonel; exitDate'ten
  // sonra olamaz (aksiyonda doğrulanır); ACTIVE/PASSIVE'e dönüşte temizlenir.
  cancellationReceivedAt: emptyToNull(
    z
      .string()
      .trim()
      .regex(DATE_ONLY, "Geçerli bir fesih bildirimi tarihi girin.")
      .nullable(),
  ).optional(),
});

export const deleteMemberSchema = z.object({
  id: z.string().min(1),
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type DeleteMemberInput = z.infer<typeof deleteMemberSchema>;
