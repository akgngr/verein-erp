import { z } from "zod";

import { isValidIban } from "@/shared/finance/iban";

const text = (max: number) => z.string().trim().max(max, "auth.profileForm.validation.textMax");

/**
 * Profil formu. IBAN ve vergi numarası boş bırakılırsa kayıtlı değer korunur
 * (ekranda yalnızca maskeli gösterilir); silmek için ilgili "kaldır" kutusu işaretlenir.
 */
export const profileSchema = z.object({
  phone: text(40),
  mobile: text(40),
  street: text(120),
  houseNumber: text(20),
  postalCode: text(10),
  city: text(80),
  country: z.string().trim().refine((value) => value === "" || /^[A-Z]{2}$/.test(value), "auth.profileForm.validation.country"),
  accountHolder: text(120),
  iban: z.string().trim().refine((value) => value === "" || isValidIban(value), "auth.profileForm.validation.iban"),
  clearIban: z.boolean(),
  bic: z.string().trim().refine((value) => value === "" || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(value), "auth.profileForm.validation.bic"),
  bankName: text(120),
  businessName: text(150),
  taxNumber: text(30),
  clearTaxNumber: z.boolean(),
  vatId: z.string().trim().refine((value) => value === "" || /^[A-Z]{2}[A-Z0-9]{2,13}$/i.test(value.replace(/\s+/g, "")), "auth.profileForm.validation.vatId"),
  isSmallBusiness: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Ekranda gösterilen profil: IBAN ve vergi numarası yalnızca maskeli. */
export type ProfileData = Omit<ProfileInput, "iban" | "taxNumber" | "clearIban" | "clearTaxNumber"> & {
  ibanMasked: string | null;
  taxNumberMasked: string | null;
  updatedAt: Date | null;
};

