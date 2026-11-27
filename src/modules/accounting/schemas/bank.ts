import { z } from "zod";

/** ACC-4 / #616 banka içe aktarma / eşleştirme şemaları. Dosya içeriği istemcide metne çevrilir (≤ 5 MB). */
export const BANK_MAX_CHARS = 5_000_000;

export const bankImportSchema = z.object({
  accountId: z.string().trim().min(1, "accounting.validation.accountRequired"),
  fileName: z.string().trim().min(1).max(200),
  format: z.enum(["AUTO", "CAMT053", "MT940", "CSV"]),
  content: z.string().min(1, "accounting.bank.errors.empty").max(BANK_MAX_CHARS, "accounting.bank.errors.tooLarge"),
});

export const bankBookSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("invoice"),
    id: z.string().min(1),
    invoiceId: z.string().min(1, "accounting.bank.errors.invoiceRequired"),
    categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
    closeRemainder: z.boolean().default(false),
  }),
  z.object({
    mode: z.literal("payable"),
    id: z.string().min(1),
    payableId: z.string().min(1, "accounting.bank.errors.payableRequired"),
  }),
  z.object({
    mode: z.literal("memberDue"),
    id: z.string().min(1),
    dueId: z.string().min(1, "accounting.bank.errors.memberDueRequired"),
    categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
  }),
  z.object({
    mode: z.literal("courseCharge"),
    id: z.string().min(1),
    chargeId: z.string().min(1, "accounting.bank.errors.courseChargeRequired"),
  }),
  z.object({
    mode: z.literal("donation"),
    id: z.string().min(1),
    donorId: z.string().trim().optional().nullable(),
    newDonorName: z.string().trim().max(200).optional().nullable(),
    newDonorType: z.enum(["PERSON", "ORGANIZATION"]).default("PERSON"),
    purposeNote: z.string().trim().max(300).optional().nullable(),
  }),
  z.object({
    mode: z.literal("category"),
    id: z.string().min(1),
    categoryId: z.string().trim().min(1, "accounting.validation.categoryRequired"),
    taxRate: z.coerce.number().int().refine((value) => [0, 7, 19].includes(value), "accounting.validation.taxRateInvalid"),
    learnRule: z.enum(["NONE", "COUNTERPARTY", "PURPOSE"]).default("NONE"),
  }),
]);

export const bankStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["OPEN", "PRIVATE", "IGNORED"]) });
export const bankRuleIdSchema = z.object({ id: z.string().min(1) });
