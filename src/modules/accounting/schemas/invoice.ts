import { z } from "zod";

import { INVOICE_KIND_VALUES, INVOICE_MAX_LINES, INVOICE_TAX_RATES } from "../constants";

/**
 * Fatura/proforma formu. Tarihler "YYYY-MM-DD"; tutar ve miktar string ("12,50"),
 * sunucuda cent / sayıya çevrilir. Numara şemada YOK — kesinleştirmede sunucu verir.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const text = (max: number) => z.string().trim().max(max, "accounting.invoices.validation.textMax");
const optionalDate = z.string().trim().refine((value) => value === "" || DATE_ONLY.test(value), "accounting.validation.bookingDateInvalid");
const DECIMAL = /^\d{1,7}([.,]\d{1,2})?$/;

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "accounting.invoices.validation.lineDescription").max(300, "accounting.invoices.validation.textMax"),
  quantity: z.string().trim().regex(DECIMAL, "accounting.invoices.validation.quantity"),
  unit: text(20),
  unitPrice: z.string().trim().regex(DECIMAL, "accounting.invoices.validation.price"),
  taxRate: z.enum(INVOICE_TAX_RATES.map(String) as [string, ...string[]]),
});

export const invoiceSchema = z.object({
  kind: z.enum(INVOICE_KIND_VALUES),
  issueDate: z.string().trim().regex(DATE_ONLY, "accounting.validation.bookingDateInvalid"),
  dueDate: optionalDate,
  serviceDate: text(80),
  recipientName: z.string().trim().min(2, "accounting.invoices.validation.recipient").max(150, "accounting.invoices.validation.textMax"),
  recipientAddress: text(400),
  recipientEmail: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
  subject: text(150),
  introText: text(1000),
  footerText: text(1000),
  taxNote: text(300),
  categoryId: text(64),
  lines: z.array(invoiceLineSchema).min(1, "accounting.invoices.validation.lines").max(INVOICE_MAX_LINES),
});

export const invoiceUpdateSchema = invoiceSchema.extend({ id: z.string().min(1) });
export const invoiceIdSchema = z.object({ id: z.string().min(1) });
export const invoiceCancelSchema = z.object({ id: z.string().min(1), reason: z.string().trim().min(3, "accounting.invoices.validation.reason").max(300) });
export const invoicePaymentSchema = z.object({
  id: z.string().min(1),
  paidDate: z.string().trim().regex(DATE_ONLY, "accounting.validation.bookingDateInvalid"),
  accountId: z.string().trim().min(1, "accounting.validation.accountRequired"),
  categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
});
export const invoiceSettingsSchema = z.object({
  defaultTaxRate: z.enum(INVOICE_TAX_RATES.map(String) as [string, ...string[]]),
  taxNote: text(300),
  paymentDays: z.string().trim().regex(/^\d{1,3}$/, "accounting.invoices.validation.paymentDays"),
  bankDetails: text(400),
  footerText: text(1000),
  incomeCategoryId: text(64),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineFormInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;

/** "1.234,50" / "12.5" → sayı (miktar). */
export function parseDecimal(value: string): number {
  return Number(value.replace(",", "."));
}
