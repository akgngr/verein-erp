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
    (value) => (value === undefined || (typeof value === "string" && value.trim() === "") ? null : value),
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
    .min(2, "members.validation.firstNameMin")
    .max(60, "members.validation.firstNameMax"),
  lastName: z
    .string()
    .trim()
    .min(2, "members.validation.lastNameMin")
    .max(60, "members.validation.lastNameMax"),
  kimlikNo: emptyToNull(
    z
      .string()
      .trim()
      .max(60, "members.validation.idNumberMax")
      .nullable(),
  ),
  email: emptyToNull(
    z
      .string()
      .trim()
      .max(120, "members.validation.emailMax")
      .email("validation.emailInvalid")
      .nullable(),
  ),
  phone: emptyToNull(
    z
      .string()
      .trim()
      .max(30, "members.validation.phoneMax")
      .regex(PHONE, "members.validation.phoneInvalid")
      .nullable(),
  ),
  // Alman adres alanları — her biri opsiyonel; en azından street veya city önerilir.
  street: emptyToNull(
    z.string().trim().max(120, "members.validation.streetMax").nullable(),
  ),
  houseNumber: emptyToNull(
    z.string().trim().max(20, "members.validation.houseNumberMax").nullable(),
  ),
  // Faz 4 (4.6): Ülke alanı eklendi; PLZ kuralı ülkeye bağlıdır (refinePostalCode).
  country: emptyToNull(
    z.string().trim().max(60, "members.validation.countryMax").nullable(),
  ),
  postalCode: emptyToNull(
    z
      .string()
      .trim()
      .max(10, "members.validation.postalCodeMax")
      .nullable(),
  ),
  city: emptyToNull(
    z.string().trim().max(120, "members.validation.cityMax").nullable(),
  ),
  state: emptyToNull(
    z.string().trim().max(120, "members.validation.stateMax").nullable(),
  ),
  birthDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "members.validation.birthDateInvalid").nullable(),
  ),
  profession: emptyToNull(
    z.string().trim().max(100, "members.validation.professionMax").nullable(),
  ),
  joinDate: z
    .string()
    .trim()
    .min(1, "members.validation.joinDateRequired")
    .regex(DATE_ONLY, "members.validation.joinDateInvalid"),
  exitDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "members.validation.exitDateInvalid").nullable(),
  ),
  exitReason: emptyToNull(
    z.string().trim().max(500, "members.validation.exitReasonMax").nullable(),
  ),
  notes: emptyToNull(
    z.string().trim().max(2000, "members.validation.notesMax").nullable(),
  ),
};

/** Faz 4 (4.6): Ülke boş veya Almanya ise PLZ 5 haneli olmalıdır; aksi halde serbest ≤10. */
function refinePostalCode<
  Data extends { country?: string | null; postalCode?: string | null },
>(data: Data, ctx: z.RefinementCtx): void {
  const country = data.country ?? null;
  const postalCode = data.postalCode ?? null;
  const isGermany =
    country === null ||
    country === "" ||
    /^(deutschland|germany|almanya)$/i.test(country.trim());
  if (isGermany && postalCode && !/^\d{5}$/.test(postalCode)) {
    ctx.addIssue({
      code: "custom",
      path: ["postalCode"],
      message: "members.validation.postalCodeDe",
    });
  }
}

/** exitDate verilmişse joinDate'ten önce olamaz; exitReason verilmişse exitDate de verilmeli. */
function refineMemberDates<
  Data extends { joinDate: string; exitDate?: string | null; exitReason?: string | null },
>(data: Data, ctx: z.RefinementCtx): void {
  const exitDate = data.exitDate ?? null;
  const exitReason = data.exitReason ?? null;
  if (exitDate && exitDate < data.joinDate) {
    ctx.addIssue({
      code: "custom",
      path: ["exitDate"],
      message: "members.validation.exitBeforeJoin",
    });
  }
  if (exitReason && !exitDate) {
    ctx.addIssue({
      code: "custom",
      path: ["exitDate"],
      message: "members.validation.exitReasonNeedsDate",
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
    updatedAt: z.string().min(1, "members.validation.versionMissing"),
  })
  .superRefine((data, ctx) => {
    refineMemberDates(data, ctx);
    refinePostalCode(data, ctx);
  });

export const changeStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"]),
  exitDate: emptyToNull(
    z.string().trim().regex(DATE_ONLY, "members.validation.exitDateInvalid").nullable(),
  ).optional(),
  exitReason: emptyToNull(
    z.string().trim().max(500, "members.validation.exitReasonMax").nullable(),
  ).optional(),
  // Faz 4 (4.6): fesih bildirimi tarihi — RESIGNED'e geçişte opsiyonel; exitDate'ten
  // sonra olamaz (aksiyonda doğrulanır); ACTIVE/PASSIVE'e dönüşte temizlenir.
  cancellationReceivedAt: emptyToNull(
    z
      .string()
      .trim()
      .regex(DATE_ONLY, "members.validation.noticeDateInvalid")
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
