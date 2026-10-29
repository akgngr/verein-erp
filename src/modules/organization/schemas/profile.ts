import { z } from "zod";

/**
 * Dernek ana verileri şeması (Faz 4, 4.2).
 *
 * KARAR: postalCode, ülke boş ya da "Deutschland" ise 5 hane zorunlu; başka
 * ülkede serbest metin (≤ 10, members modülü kuralıyla aynı). Boş string'ler
 * null'a çevrilir (documents/meetings kalıbı); metinler trim edilir.
 */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );

const emailLike = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(200).email("validation.emailInvalid").nullable(),
);

const urlLike = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(200)
    .url("organization.validation.websiteInvalid")
    .nullable(),
);

const isoDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "organization.validation.dateFormat")
    .nullable(),
);

export const organizationUpdateSchema = z
  .object({
    name: z.string().trim().min(3, "organization.validation.nameMin").max(200),
    street: optionalText(200),
    postalCode: optionalText(10),
    city: optionalText(200),
    country: optionalText(200),
    email: emailLike,
    phone: optionalText(200),
    website: urlLike,
    registerCourt: optionalText(200),
    registerNumber: optionalText(30),
    taxNumber: optionalText(30),
    taxOffice: optionalText(200),
    exemptionNoticeDate: isoDate,
    exemptionNoticePeriod: optionalText(200),
    // Faz 5 (§ 4): Gemeinnützigkeit — belge türü, amaç metni, aidat indirilebilirliği.
    exemptionDocumentType: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? null : value),
        z.enum(["EXEMPTION_NOTICE", "TAX_ASSESSMENT_ANNEX", "SPECIAL_ASSESSMENT_60A"]).nullable(),
      ),
    charitablePurposes: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? null : value),
        z
          .string()
          .trim()
          .max(500, "organization.validation.purposesMax")
          .nullable(),
      ),
    // KARAR (§ 1): Uygulama § 10b Abs. 1 Satz 8 EStG kararını veremez — bayrak
    // varsayılan false; açılmadan aidat bildirimi düzenlenemez.
    membershipFeesDeductible: z.boolean().default(false),
    // Eşzamanlılık koruması (4.2): formun hidden alanından gelen ISO zaman.
    // KARAR: ilk kayıtta satır (ve updatedAt) henüz yoktur → boş geçilebilir;
    // aksiyon yalnızca mevcut satır varsa karşılaştırma yapar.
    updatedAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const country = (data.country ?? "").trim().toLowerCase();
    const isGermany = country === "" || country === "deutschland" || country === "germany" || country === "almanya";
    if (isGermany && data.postalCode !== null && !/^\d{5}$/.test(data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: "organization.validation.postalCodeDe",
      });
    }
  });

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
