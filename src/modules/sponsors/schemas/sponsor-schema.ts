import { z } from "zod";

import { toCents } from "@/shared/money";

import { SPONSOR_STATUSES, SPONSOR_TIERS } from "../constants";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidOptionalEmail(value: string): boolean {
  if (!value) return true;
  return z.email().safeParse(value).success;
}

function isValidOptionalWebsite(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAmount(value: string): boolean {
  if (!value) return true;
  const cents = toCents(value);
  return cents !== null && cents >= 0;
}

/** Form ve action aynı Zod şemasını kullanır; tüm mesajlar çeviri anahtarıdır. */
export const sponsorFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "sponsors.validation.nameRequired")
      .max(200, "sponsors.validation.nameMax"),
    tier: z.enum(SPONSOR_TIERS),
    status: z.enum(SPONSOR_STATUSES),
    amount: z
      .string()
      .trim()
      .refine(isValidAmount, { message: "sponsors.validation.amountInvalid" }),
    contactName: z.string().trim().max(150, "sponsors.validation.contactNameMax"),
    contactEmail: z
      .string()
      .trim()
      .max(200, "sponsors.validation.contactEmailMax")
      .refine(isValidOptionalEmail, { message: "sponsors.validation.contactEmailInvalid" }),
    contactPhone: z.string().trim().max(50, "sponsors.validation.contactPhoneMax"),
    website: z
      .string()
      .trim()
      .max(300, "sponsors.validation.websiteMax")
      .refine(isValidOptionalWebsite, { message: "sponsors.validation.websiteInvalid" }),
    startDate: z
      .string()
      .trim()
      .refine((v) => !v || ISO_DATE.test(v), { message: "sponsors.validation.dateInvalid" }),
    endDate: z
      .string()
      .trim()
      .refine((v) => !v || ISO_DATE.test(v), { message: "sponsors.validation.dateInvalid" }),
    notes: z.string().trim().max(2000, "sponsors.validation.notesMax"),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "sponsors.validation.endBeforeStart",
    path: ["endDate"],
  });

export const sponsorUpdateSchema = sponsorFormSchema.safeExtend({
  id: z.string().min(1),
});

export const sponsorDeleteSchema = z.object({
  id: z.string().min(1),
});

export type SponsorFormInput = z.infer<typeof sponsorFormSchema>;

/** ISO "YYYY-MM-DD" tarihini UTC gece yarısı Date nesnesine çevirir (boşsa null). */
export function parseOptionalIsoDate(value: string): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Tutar metnini integer cent'e çevirir (boşsa 0). */
export function parseSponsorAmountCents(value: string): number {
  if (!value) return 0;
  return toCents(value) ?? 0;
}
