import "server-only";

import type { BankTransactionStatus } from "@prisma/client";

import { getDb } from "@/shared/db";

import { suggestMatches, type Suggestion } from "../services/bank-matching";
import { openCents } from "../services/invoice-payments";
import { listOpenPayables } from "./payables";

export type BankRow = {
  id: string;
  accountId: string;
  accountName: string;
  bookingDate: Date;
  amountCents: number;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  purpose: string;
  reference: string | null;
  status: BankTransactionStatus;
  bookingIds: string[];
  invoiceId: string | null;
  suggestions: Array<Suggestion & { label: string }>;
};

export type BankRuleRow = { id: string; field: "COUNTERPARTY" | "PURPOSE"; pattern: string; direction: "INCOME" | "EXPENSE" | "TRANSFER"; categoryName: string; taxRate: number; hits: number };

export async function listBankTransactions(filters: { status: BankTransactionStatus; accountId?: string }): Promise<{ rows: BankRow[]; counts: Record<BankTransactionStatus, number> }> {
  const db = getDb();
  const [rows, grouped, accounts, invoices, rules, categories] = await Promise.all([
    db.accountingBankTransaction.findMany({
      where: { status: filters.status, ...(filters.accountId ? { accountId: filters.accountId } : {}) },
      orderBy: [{ bookingDate: "desc" }, { createdAt: "asc" }],
      take: 300,
    }),
    db.accountingBankTransaction.groupBy({ by: ["status"], _count: { _all: true }, ...(filters.accountId ? { where: { accountId: filters.accountId } } : {}) }),
    db.accountingAccount.findMany({ select: { id: true, name: true } }),
    filters.status === "OPEN" ? db.accountingInvoice.findMany({ where: { kind: "INVOICE", status: "ISSUED" }, select: { id: true, number: true, recipientName: true, grossCents: true, paidCents: true, skontoCents: true } }) : [],
    filters.status === "OPEN" ? db.accountingBankRule.findMany() : [],
    db.accountingCategory.findMany({ select: { id: true, name: true } }),
  ]);
  const payables = filters.status === "OPEN" ? await listOpenPayables() : [];
  const payableLabel = new Map(payables.map((payable) => [payable.id, `${payable.number ?? "—"} · ${payable.supplierName}`]));
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const openInvoices = invoices.map((invoice) => ({ id: invoice.id, number: invoice.number, recipientName: invoice.recipientName, openCents: openCents(invoice) })).filter((invoice) => invoice.openCents > 0);
  const invoiceLabel = new Map(openInvoices.map((invoice) => [invoice.id, `${invoice.number ?? "—"} · ${invoice.recipientName}`]));
  const matchRules = rules
    .filter((rule) => rule.direction !== "TRANSFER")
    .map((rule) => ({ id: rule.id, field: rule.field, pattern: rule.pattern, direction: rule.direction as "INCOME" | "EXPENSE", categoryId: rule.categoryId, taxRate: rule.taxRate }));
  const counts = { OPEN: 0, BOOKED: 0, PRIVATE: 0, IGNORED: 0 } as Record<BankTransactionStatus, number>;
  for (const group of grouped) counts[group.status] = group._count._all;
  return {
    counts,
    rows: rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      accountName: accountName.get(row.accountId) ?? "—",
      bookingDate: row.bookingDate,
      amountCents: row.amountCents,
      counterpartyName: row.counterpartyName,
      counterpartyIban: row.counterpartyIban,
      purpose: row.purpose,
      reference: row.reference,
      status: row.status,
      bookingIds: row.bookingIds ? row.bookingIds.split(",") : [],
      invoiceId: row.invoiceId,
      suggestions:
        row.status === "OPEN"
          ? suggestMatches(row, openInvoices, matchRules, payables).map((suggestion) => ({
              ...suggestion,
              label:
                suggestion.kind === "invoice"
                  ? invoiceLabel.get(suggestion.invoiceId) ?? ""
                  : suggestion.kind === "payable"
                    ? payableLabel.get(suggestion.payableId) ?? ""
                    : `${categoryName.get(suggestion.categoryId) ?? "—"} · ${suggestion.taxRate} %`,
            }))
          : [],
    })),
  };
}

export async function listBankRules(): Promise<BankRuleRow[]> {
  const db = getDb();
  const [rules, categories] = await Promise.all([db.accountingBankRule.findMany({ orderBy: [{ hits: "desc" }, { pattern: "asc" }] }), db.accountingCategory.findMany({ select: { id: true, name: true } })]);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return rules.map((rule) => ({ id: rule.id, field: rule.field, pattern: rule.pattern, direction: rule.direction, categoryName: names.get(rule.categoryId) ?? "—", taxRate: rule.taxRate, hits: rule.hits }));
}

/** Formdaki açık fatura seçimi. */
export async function listOpenInvoiceOptions(): Promise<Array<{ value: string; label: string; openCents: number }>> {
  const invoices = await getDb().accountingInvoice.findMany({ where: { kind: "INVOICE", status: "ISSUED" }, orderBy: { issueDate: "asc" } });
  return invoices
    .map((invoice) => ({ value: invoice.id, label: `${invoice.number ?? "—"} · ${invoice.recipientName}`, openCents: openCents(invoice) }))
    .filter((invoice) => invoice.openCents > 0);
}
