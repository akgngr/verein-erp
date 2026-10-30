import { z } from "zod";

import { isValidIban } from "../utils";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const text = (max: number) => z.string().trim().max(max, "students.validation.textMax");

/** Veli (Debitor) formu. Adres DATEV Stammdaten alanlarına ayrık tutulur. */
export const guardianSchema = z.object({
  salutation: text(20),
  firstName: z.string().trim().min(1, "students.validation.firstNameRequired").max(80, "students.validation.nameMax"),
  lastName: z.string().trim().min(1, "students.validation.lastNameRequired").max(80, "students.validation.nameMax"),
  street: text(120),
  houseNumber: text(20),
  postalCode: text(10),
  city: text(80),
  country: z.string().trim().regex(/^[A-Z]{2}$/, "students.validation.countryInvalid"),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
  phone: text(40),
  iban: z.string().trim().refine((value) => value === "" || isValidIban(value), "students.validation.ibanInvalid"),
  bic: z.string().trim().refine((value) => value === "" || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(value), "students.validation.bicInvalid"),
  accountHolder: text(120),
  sepaMandateReference: text(35),
  sepaMandateDate: z.string().trim().refine((value) => value === "" || DATE_ONLY.test(value), "students.validation.dateInvalid"),
  note: text(2000),
});

export const guardianUpdateSchema = guardianSchema.extend({ id: z.string().min(1) });
export const guardianDeleteSchema = z.object({ id: z.string().min(1) });

export type GuardianInput = z.infer<typeof guardianSchema>;
