import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^\d{1,7}([.,]\d{1,2})?$/;
const text = (max: number) => z.string().trim().max(max, "accounting.invoices.validation.textMax");
const optionalDate = z.string().trim().refine((value) => value === "" || DATE_ONLY.test(value), "accounting.validation.bookingDateInvalid");
const money = z.string().trim().refine((value) => value === "" || DECIMAL.test(value), "accounting.invoices.validation.price");

/** ACC-5 gelen fatura formu. Oran başına net + (isteğe bağlı) KDV; boş KDV hesaplanır. */
export const payableSchema = z.object({
  id: z.string().min(1),
  contactId: text(64),
  supplierName: z.string().trim().min(2, "accounting.payables.validation.supplier").max(150, "accounting.invoices.validation.textMax"),
  supplierVatId: text(20),
  supplierTaxNumber: text(30),
  supplierAddress: text(300),
  supplierIban: text(34),
  number: text(60),
  issueDate: z.string().trim().regex(DATE_ONLY, "accounting.validation.bookingDateInvalid"),
  dueDate: optionalDate,
  serviceDate: text(80),
  categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
  net19: money,
  tax19: money,
  net7: money,
  tax7: money,
  net0: money,
  notes: text(1000),
});
export type PayableInput = z.infer<typeof payableSchema>;

export const payablePaySchema = z.object({
  id: z.string().min(1),
  paidDate: z.string().trim().regex(DATE_ONLY, "accounting.validation.bookingDateInvalid"),
  accountId: z.string().trim().min(1, "accounting.validation.accountRequired"),
  amount: money,
});
export const payableIdSchema = z.object({ id: z.string().min(1) });
export const payableCancelSchema = z.object({ id: z.string().min(1), reason: z.string().trim().min(3, "accounting.invoices.validation.reason").max(300) });
