import "server-only";

import { z } from "zod";

import { euros, yearSchema } from "@/shared/ai/define";
import { aiToolV2, defineModuleAiV2, type AiDataPolicy } from "@/shared/ai/v2";
import { can } from "@/shared/permissions/define";

import { accountingPermissions } from "./permissions";
import { getIncomeExpenseReport, listAccountBalances } from "./server";
import { listTaxRows, listUstvaRows } from "./queries/tax-reports";
import { getEuerAdjustments } from "./queries/assets";
import { listOpenItems } from "./queries/invoices";
import { AGING_BUCKETS } from "./services/invoice-payments";
import { berlinToday } from "./utils";
import { getTaxSettings } from "./services/tax";
import { computeEuer, computeUstva, vatPeriods } from "./services/tax-reports";
import { getDb } from "@/shared/db";

/**
 * Muhasebe: yalnızca toplamlar ve hazır rapor bağlantıları; kişi adı, karşı taraf, IBAN, açıklama dönmez.
 * v2 sözleşmesi (src/shared/ai/v2.ts): çıktı alan listesiyle sınırlı. Kurumsal toplam veri olduğu için
 * denetimli bulut modunda da kullanılabilir (modelDataClass: aggregate / internal).
 */
const view = (user: { role: Parameters<typeof can>[0] }) => can(user.role, accountingPermissions, "view");
const policy = (purpose: string, serverReads: AiDataPolicy["serverReads"], modelFields: string[], modelDataClass: "aggregate" | "internal" = "aggregate"): AiDataPolicy =>
  ({ purpose, serverReads, modelFields, processing: "approved_provider", modelDataClass });
const noInput = z.object({}).strict();

const summaryOutput = z.object({
  year: z.number().int(),
  categories: z.array(z.object({ category: z.string(), sphere: z.string().nullable(), direction: z.string(), actualEur: z.number(), planEur: z.number(), previousYearEur: z.number() }).strict()),
  economicOperationNotice: z.string(),
  grossTotals: z.object({ incomeEur: z.number(), expenseEur: z.number(), netEur: z.number() }).strict(),
  uncategorized: z.object({ incomeEur: z.number(), expenseEur: z.number() }).strict(),
  accounts: z.array(z.object({ account: z.string(), type: z.string(), balanceEur: z.number() }).strict()),
}).strict();
const vatOutput = z.object({
  year: z.number().int(), chartOfAccounts: z.string(), smallBusiness: z.boolean(), taxMethod: z.string(),
  periods: z.array(z.object({ period: z.string(), kz81BaseEur: z.number(), kz86BaseEur: z.number(), kz66Eur: z.number(), kz83Eur: z.number() }).strict()),
  euer: z.object({ incomeNetEur: z.number(), outputTaxEur: z.number(), expenseNetEur: z.number(), inputTaxEur: z.number(), resultEur: z.number() }).strict(),
  page: z.string(),
}).strict();
const openItemsOutput = z.object({ buckets: z.array(z.object({ bucket: z.string(), count: z.number().int(), openEur: z.number() }).strict()), totalOpenEur: z.number(), page: z.string() }).strict();
const bankOutput = z.object({ statuses: z.array(z.object({ status: z.string(), count: z.number().int(), sumEur: z.number() }).strict()), page: z.string() }).strict();
const payablesOutput = z.object({
  statuses: z.array(z.object({ status: z.string(), count: z.number().int(), grossEur: z.number() }).strict()),
  openEur: z.number(), overdueCount: z.number().int(), page: z.string(),
}).strict();
const reportInput = z.object({ report: z.enum(["income_expense_pdf", "income_expense_excel", "annual_report_pdf", "datev_bookings"]).describe("income_expense_pdf: income/expense list (PDF); income_expense_excel: same list (Excel); annual_report_pdf: annual treasurer report (Kassenbericht); datev_bookings: DATEV EXTF booking batch for the tax advisor"), year: z.number().int().min(2000).max(2100) }).strict(); // i18n-ignore (model-facing tool text)
const reportOutput = z.object({ url: z.string(), note: z.string() }).strict();

/** Model-görünür alanlar; src/shared/data-policy.ts AI_TOOL_POLICY ile aynı olmalı. */
export const ACCOUNTING_AI_FIELDS = {
  get_accounting_summary: ["year", "categories", "categories.category", "categories.sphere", "categories.direction", "categories.actualEur", "categories.planEur", "categories.previousYearEur", "economicOperationNotice", "grossTotals", "grossTotals.incomeEur", "grossTotals.expenseEur", "grossTotals.netEur", "uncategorized", "uncategorized.incomeEur", "uncategorized.expenseEur", "accounts", "accounts.account", "accounts.type", "accounts.balanceEur"],
  get_vat_summary: ["year", "chartOfAccounts", "smallBusiness", "taxMethod", "periods", "periods.period", "periods.kz81BaseEur", "periods.kz86BaseEur", "periods.kz66Eur", "periods.kz83Eur", "euer", "euer.incomeNetEur", "euer.outputTaxEur", "euer.expenseNetEur", "euer.inputTaxEur", "euer.resultEur", "page"],
  get_open_items_summary: ["buckets", "buckets.bucket", "buckets.count", "buckets.openEur", "totalOpenEur", "page"],
  get_bank_inbox_summary: ["statuses", "statuses.status", "statuses.count", "statuses.sumEur", "page"],
  get_payables_summary: ["statuses", "statuses.status", "statuses.count", "statuses.grossEur", "openEur", "overdueCount", "page"],
  get_report_link: ["url", "note"],
} as const;
const fields = (name: keyof typeof ACCOUNTING_AI_FIELDS) => [...ACCOUNTING_AI_FIELDS[name]];

export const ai = defineModuleAiV2({
  module: "accounting",
  tools: [
    aiToolV2({
      name: "get_accounting_summary",
      operation: "read",
      allowed: view,
      description:
        "Income/expense summary for a fiscal year: actual, planned and previous-year amounts (EUR) per category and tax sphere, plus account balances. Contains no personal data.", // i18n-ignore (model-facing tool text)
      input: yearSchema, result: summaryOutput, modelOutput: summaryOutput,
      policy: policy("accounting-summary", ["AccountingBooking", "AccountingAccount", "AccountingYear", "AccountingCategory"], fields("get_accounting_summary"), "internal"),
      limits: { maxRows: 500 },
      projectForModel: (result) => result,
      run: async ({ year }) => {
        const [report, balances] = await Promise.all([getIncomeExpenseReport(year), listAccountBalances()]);
        return {
          year,
          categories: report.rows
            .filter((row) => row.categoryId)
            .map((row) => ({
              category: row.categoryName,
              sphere: row.sphere,
              direction: row.direction,
              actualEur: euros(row.actualCents),
              planEur: euros(row.planCents),
              previousYearEur: euros(row.previousYearCents),
            })),
          economicOperationNotice: report.economicOperationNotice,
          grossTotals: {
            incomeEur: euros(report.bookingTotals.incomeCents),
            expenseEur: euros(report.bookingTotals.expenseCents),
            netEur: euros(report.bookingTotals.netCents),
          },
          uncategorized: {
            incomeEur: euros(report.uncategorized.incomeCents),
            expenseEur: euros(report.uncategorized.expenseCents),
          },
          accounts: balances.filter((account) => account.isActive).map((account) => ({ account: account.name, type: account.type, balanceEur: euros(account.balanceCents) })),
        };
      },
    }),
    aiToolV2({
      name: "get_vat_summary",
      operation: "read",
      allowed: view,
      description:
        "VAT (Umsatzsteuer) overview for a year: UStVA key figures per filing period (Kz 81/86 tax bases, Kz 66 input tax, Kz 83 payable/refund) and a simplified EÜR result. Totals only, no personal data. Not a tax filing; the user must verify and submit via Elster.", // i18n-ignore (model-facing tool text)
      input: yearSchema, result: vatOutput, modelOutput: vatOutput,
      policy: policy("accounting-vat", ["AccountingBooking", "AccountingSettings"], fields("get_vat_summary")),
      projectForModel: (result) => result,
      run: async ({ year }) => {
        const settings = await getTaxSettings(getDb());
        const from = new Date(Date.UTC(year, 0, 1));
        const to = new Date(Date.UTC(year, 11, 31));
        const [rows, ustvaRows] = await Promise.all([
          listTaxRows(from, to),
          listUstvaRows(from, to, settings.taxMethod),
        ]);
        const periods = vatPeriods(year, settings.vatPeriod).map((period) => {
          const result = computeUstva(ustvaRows.filter((row) => row.bookingDate >= period.from && row.bookingDate <= period.to));
          return { period: period.key, kz81BaseEur: result.kz81BaseEuros, kz86BaseEur: result.kz86BaseEuros, kz66Eur: euros(result.kz66Cents), kz83Eur: euros(result.kz83Cents) };
        });
        const euer = computeEuer(rows, await getEuerAdjustments(year));
        return {
          year,
          chartOfAccounts: settings.chartOfAccounts,
          smallBusiness: settings.smallBusiness,
          taxMethod: settings.taxMethod,
          periods,
          euer: { incomeNetEur: euros(euer.incomeNetCents), outputTaxEur: euros(euer.outputTaxCents), expenseNetEur: euros(euer.expenseNetCents), inputTaxEur: euros(euer.inputTaxCents), resultEur: euros(euer.resultCents) },
          page: `/muhasebe/vergi?yil=${year}`,
        };
      },
    }),
    aiToolV2({
      name: "get_open_items_summary",
      operation: "read",
      allowed: view,
      description:
        "Accounts receivable (open invoices / OPOS) aging summary: count and open amount (EUR) per aging bucket (not due, 1-30, 31-60, 61-90, >90 days overdue). Totals only — no customer names or invoice details.", // i18n-ignore (model-facing tool text)
      input: noInput, result: openItemsOutput, modelOutput: openItemsOutput,
      policy: policy("accounting-open-items", ["AccountingInvoice", "AccountingInvoicePayment"], fields("get_open_items_summary")),
      projectForModel: (result) => result,
      run: async () => {
        const rows = await listOpenItems(berlinToday());
        return {
          buckets: AGING_BUCKETS.map((bucket) => {
            const items = rows.filter((row) => row.bucket === bucket);
            return { bucket, count: items.length, openEur: euros(items.reduce((sum, row) => sum + row.openCents, 0)) };
          }),
          totalOpenEur: euros(rows.reduce((sum, row) => sum + row.openCents, 0)),
          page: "/muhasebe/faturalar?gorunum=opos",
        };
      },
    }),
    aiToolV2({
      name: "get_bank_inbox_summary",
      operation: "read",
      allowed: view,
      description:
        "Imported bank statement lines by status (open / booked / private / ignored) with counts and sums (EUR). Totals only — no counterparties, IBANs or purposes. Booking happens only on the bank page after user confirmation.", // i18n-ignore (model-facing tool text)
      input: noInput, result: bankOutput, modelOutput: bankOutput,
      policy: policy("accounting-bank-inbox", ["AccountingBankTransaction"], fields("get_bank_inbox_summary")),
      projectForModel: (result) => result,
      run: async () => {
        const groups = await getDb().accountingBankTransaction.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountCents: true } });
        return {
          statuses: groups.map((group) => ({ status: group.status, count: group._count._all, sumEur: euros(group._sum.amountCents ?? 0) })),
          page: "/muhasebe/banka",
        };
      },
    }),
    aiToolV2({
      name: "get_payables_summary",
      operation: "read",
      allowed: view,
      description:
        "Incoming invoices (payables) by status: counts, gross and open amounts (EUR), and how many are overdue. Totals only — no supplier names or invoice details.", // i18n-ignore (model-facing tool text)
      input: noInput, result: payablesOutput, modelOutput: payablesOutput,
      policy: policy("accounting-payables", ["AccountingPayable"], fields("get_payables_summary")),
      projectForModel: (result) => result,
      run: async () => {
        const items = await getDb().accountingPayable.findMany({ select: { status: true, grossCents: true, paidCents: true, dueDate: true } });
        const today = berlinToday();
        return {
          statuses: (["DRAFT", "OPEN", "PAID", "CANCELLED"] as const).map((status) => {
            const list = items.filter((item) => item.status === status);
            return { status, count: list.length, grossEur: euros(list.reduce((sum, item) => sum + item.grossCents, 0)) };
          }),
          openEur: euros(items.filter((item) => item.status === "OPEN").reduce((sum, item) => sum + item.grossCents - item.paidCents, 0)),
          overdueCount: items.filter((item) => item.status === "OPEN" && item.dueDate && item.dueDate < today).length,
          page: "/muhasebe/gelen-faturalar",
        };
      },
    }),
    aiToolV2({
      name: "get_report_link",
      operation: "read",
      allowed: view,
      description:
        "Returns a download link for a ready-made report (generated by the system with the user's own permissions; its content never reaches you). Give the link to the user as a markdown link.", // i18n-ignore (model-facing tool text)
      input: reportInput, result: reportOutput, modelOutput: reportOutput,
      policy: policy("accounting-report-link", [], fields("get_report_link"), "internal"),
      projectForModel: (result) => result,
      run: async ({ report, year }) => {
        const url = {
          income_expense_pdf: `/api/accounting/export/pdf?year=${year}`,
          income_expense_excel: `/api/accounting/export?year=${year}`,
          annual_report_pdf: `/api/accounting/reports/annual/pdf?year=${year}`,
          datev_bookings: `/api/accounting/datev?kind=bookings&from=${year}-01-01&to=${year}-12-31`,
        }[report];
        return { url, note: "Give this link to the user; it opens in their browser with their own session." };
      },
    }),
  ],
  actions: {},
});
