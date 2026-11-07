import { z } from "zod";

import { BUNDESLAENDER } from "@/shared/geo/germany";

/** İstemci + sunucu: uzaktan formun alan doğrulaması (kaynak modüller ayrıca kendi kurallarını uygular). */
const text = (max: number) => z.string().trim().max(max, "online-forms.validation.tooLong").transform((value) => value || null);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = z.string().trim().refine((value) => value === "" || (DATE.test(value) && !Number.isNaN(Date.parse(value)) && value < new Date().toISOString().slice(0, 10)), "online-forms.validation.date").transform((value) => value || null);
const email = z.string().trim().max(200).refine((value) => value === "" || z.email().safeParse(value).success, "online-forms.validation.email").transform((value) => value || null);
const state = z.string().trim().refine((value) => value === "" || (BUNDESLAENDER as readonly string[]).includes(value), "online-forms.validation.state").transform((value) => value || null);
const channels = z.array(z.enum(["sms", "whatsapp", "telegram"])).max(3);
const iban = z.string().trim().max(40).refine((value) => value === "" || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value.replace(/\s/g, "").toUpperCase()), "online-forms.validation.iban").transform((value) => value || null);

export const memberDataSchema = z.object({
  email, phone: text(40), street: text(120), houseNumber: text(20), postalCode: text(10), city: text(80), state, country: text(60),
  birthDate: date, profession: text(120), messagingConsents: channels, bulkMailOptOut: z.boolean(), photoConsent: z.boolean(),
});
export const studentDataSchema = z.object({ birthDate: date, school: text(120), gradeLevel: text(20), email, phone: text(40), photoConsent: z.boolean() });
export const guardianDataSchema = z.object({
  email, phone: text(40), street: text(120), houseNumber: text(20), postalCode: text(10), city: text(80), state,
  country: z.string().trim().regex(/^[A-Z]{2}$/, "online-forms.validation.country"),
  iban, bic: z.string().trim().refine((value) => value === "" || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(value), "online-forms.validation.bic").transform((value) => value || null),
  accountHolder: text(120), messagingConsents: channels, bulkMailOptOut: z.boolean(), sepaMandate: z.boolean(),
});

export const submitSchema = z.object({
  token: z.string().min(20).max(100),
  textVersion: z.string().regex(/^[a-f0-9]{64}$/),
  /** Onaylanan belge kimlikleri. */
  documents: z.array(z.string().min(1).max(64)).max(50).default([]),
  signerName: z.string().trim().min(3, "online-forms.validation.signerName").max(120),
  /** PNG imza (≈ en çok 300 KB). */
  signature: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "online-forms.validation.signature").max(400_000, "online-forms.validation.signature"),
  privacy: z.literal(true, { error: "online-forms.validation.privacy" }),
  member: memberDataSchema.optional(),
  student: studentDataSchema.optional(),
  guardian: guardianDataSchema.optional(),
});

export type SubmitInput = z.input<typeof submitSchema>;
export const CHANNELS = ["email", "sms", "whatsapp"] as const;
export const KINDS = ["MEMBER", "STUDENT", "GUARDIAN"] as const;
