import { z } from "zod";

/** ACC-3 cari kart formu. Numara sunucuda DATEV aralığından verilir (form göndermez). */
const text = (max: number) => z.string().trim().max(max, "accounting.invoices.validation.textMax");

export const contactSchema = z.object({
  type: z.enum(["CUSTOMER", "SUPPLIER"]),
  name: z.string().trim().min(2, "accounting.contacts.validation.name").max(150, "accounting.invoices.validation.textMax"),
  contactPerson: text(100),
  address: text(400),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
  phone: text(40),
  vatId: z.string().trim().refine((value) => value === "" || /^[A-Z]{2}[A-Z0-9]{2,13}$/.test(value.replace(/\s/g, "").toUpperCase()), "accounting.contacts.validation.vatId"),
  paymentTermDays: z.string().trim().refine((value) => value === "" || /^\d{1,3}$/.test(value), "accounting.invoices.validation.paymentDays"),
  notes: text(1000),
});

export const contactUpdateSchema = contactSchema.extend({ id: z.string().min(1), isActive: z.boolean() });

export type ContactInput = z.infer<typeof contactSchema>;
