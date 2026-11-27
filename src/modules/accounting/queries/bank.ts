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
  canReverse: boolean;
  suggestions: Array<Suggestion & { label: string }>;
};

export type BankRuleRow = {
  id: string;
  field: "COUNTERPARTY" | "PURPOSE";
  pattern: string;
  direction: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryName: string;
  taxRate: number;
  hits: number;
};

export type BankMatchOption = {
  value: string;
  label: string;
  openCents: number;
};

export type BankDonorOption = {
  value: string;
  label: string;
};

export async function listBankTransactions(filters: {
  status: BankTransactionStatus;
  accountId?: string;
  capabilities?: {
    canMembers?: boolean;
    canCourses?: boolean;
    canDonations?: boolean;
  };
}): Promise<{
  rows: BankRow[];
  counts: Record<BankTransactionStatus, number>;
  memberDues: BankMatchOption[];
  courseCharges: BankMatchOption[];
  donors: BankDonorOption[];
}> {
  const db = getDb();
  const caps = filters.capabilities ?? {};
  const isOpen = filters.status === "OPEN";

  const [rows, grouped, accounts, invoices, rules, categories, payables] =
    await Promise.all([
      db.accountingBankTransaction.findMany({
        where: {
          status: filters.status,
          ...(filters.accountId ? { accountId: filters.accountId } : {}),
        },
        orderBy: [{ bookingDate: "desc" }, { createdAt: "asc" }],
        take: 300,
      }),
      db.accountingBankTransaction.groupBy({
        by: ["status"],
        _count: { _all: true },
        ...(filters.accountId ? { where: { accountId: filters.accountId } } : {}),
      }),
      db.accountingAccount.findMany({ select: { id: true, name: true } }),
      isOpen
        ? db.accountingInvoice.findMany({
            where: { kind: "INVOICE", status: "ISSUED" },
            select: {
              id: true,
              number: true,
              recipientName: true,
              grossCents: true,
              paidCents: true,
              skontoCents: true,
            },
          })
        : [],
      isOpen ? db.accountingBankRule.findMany() : [],
      db.accountingCategory.findMany({ select: { id: true, name: true } }),
      isOpen ? listOpenPayables() : [],
    ]);

  // Dynamic cross-module imports avoid static circular dependencies (courses/donations -> accounting).
  const [openDues, openCharges, activeDonors] = await Promise.all([
    isOpen && caps.canMembers
      ? import("@/modules/members/server").then((m) =>
          m.listOpenMemberDuesForBankMatch(),
        )
      : Promise.resolve([]),
    isOpen && caps.canCourses
      ? import("@/modules/courses/server").then((m) =>
          m.listOpenCourseChargesForBankMatch(),
        )
      : Promise.resolve([]),
    isOpen && caps.canDonations
      ? import("@/modules/donations/server").then((m) =>
          m.listActiveDonorsForBankMatch(),
        )
      : Promise.resolve([]),
  ]);

  // For BOOKED rows, determine which rows are backed solely by BANK sourceType (reversible here).
  const bookedIds =
    filters.status === "BOOKED"
      ? Array.from(
          new Set(
            rows.flatMap((row) =>
              row.bookingIds ? row.bookingIds.split(",").filter(Boolean) : [],
            ),
          ),
        )
      : [];
  const bookingSources = bookedIds.length
    ? new Map(
        (
          await db.accountingBooking.findMany({
            where: { id: { in: bookedIds } },
            select: { id: true, sourceType: true },
          })
        ).map((b) => [b.id, b.sourceType]),
      )
    : new Map<string, string | null>();

  const payableLabel = new Map(
    payables.map((payable) => [
      payable.id,
      `${payable.number ?? "—"} · ${payable.supplierName}`,
    ]),
  );
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryName = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const openInvoices = invoices
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      recipientName: invoice.recipientName,
      openCents: openCents(invoice),
    }))
    .filter((invoice) => invoice.openCents > 0);
  const invoiceLabel = new Map(
    openInvoices.map((invoice) => [
      invoice.id,
      `${invoice.number ?? "—"} · ${invoice.recipientName}`,
    ]),
  );
  const memberDueLabel = new Map(
    openDues.map((due) => [
      due.dueId,
      `${due.membershipNumber} (${due.year}) · ${due.name}`,
    ]),
  );
  const courseChargeLabel = new Map(
    openCharges.map((charge) => [
      charge.chargeId,
      `${charge.courseCode} · ${charge.label} · ${charge.payerLabel ?? charge.studentLabel}`,
    ]),
  );
  const donorLabel = new Map(
    activeDonors.map((donor) => [
      donor.id,
      `${donor.donorCode} · ${donor.name}`,
    ]),
  );

  const matchRules = rules
    .filter((rule) => rule.direction !== "TRANSFER")
    .map((rule) => ({
      id: rule.id,
      field: rule.field,
      pattern: rule.pattern,
      direction: rule.direction as "INCOME" | "EXPENSE",
      categoryId: rule.categoryId,
      taxRate: rule.taxRate,
    }));

  const counts = {
    OPEN: 0,
    BOOKED: 0,
    PRIVATE: 0,
    IGNORED: 0,
  } as Record<BankTransactionStatus, number>;
  for (const group of grouped) counts[group.status] = group._count._all;

  return {
    counts,
    memberDues: openDues.map((due) => ({
      value: due.dueId,
      label: memberDueLabel.get(due.dueId) ?? due.membershipNumber,
      openCents: due.openCents,
    })),
    courseCharges: openCharges.map((charge) => ({
      value: charge.chargeId,
      label: courseChargeLabel.get(charge.chargeId) ?? charge.courseCode,
      openCents: charge.amountCents,
    })),
    donors: activeDonors.map((donor) => ({
      value: donor.id,
      label: donorLabel.get(donor.id) ?? donor.donorCode,
    })),
    rows: rows.map((row) => {
      const linkedIds = row.bookingIds
        ? row.bookingIds.split(",").filter(Boolean)
        : [];
      const canReverse =
        row.status === "BOOKED" &&
        !row.invoiceId &&
        linkedIds.length > 0 &&
        linkedIds.every((id) => bookingSources.get(id) === "BANK");

      return {
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
        bookingIds: linkedIds,
        invoiceId: row.invoiceId,
        canReverse,
        suggestions:
          row.status === "OPEN"
            ? suggestMatches(row, openInvoices, matchRules, payables, {
                memberDues: openDues,
                courseCharges: openCharges,
                donors: activeDonors,
                allowOneClickDonation: Boolean(caps.canDonations),
              }).map((suggestion) => ({
                ...suggestion,
                label:
                  suggestion.kind === "invoice"
                    ? (invoiceLabel.get(suggestion.invoiceId) ?? "")
                    : suggestion.kind === "payable"
                      ? (payableLabel.get(suggestion.payableId) ?? "")
                      : suggestion.kind === "memberDue"
                        ? (memberDueLabel.get(suggestion.dueId) ?? "")
                        : suggestion.kind === "courseCharge"
                          ? (courseChargeLabel.get(suggestion.chargeId) ?? "")
                          : suggestion.kind === "donation"
                            ? (suggestion.donorId
                                ? (donorLabel.get(suggestion.donorId) ?? "")
                                : (row.counterpartyName ?? "—"))
                            : `${categoryName.get(suggestion.categoryId) ?? "—"} · ${suggestion.taxRate} %`,
              }))
            : [],
      };
    }),
  };
}

export async function listBankRules(): Promise<BankRuleRow[]> {
  const db = getDb();
  const [rules, categories] = await Promise.all([
    db.accountingBankRule.findMany({ orderBy: [{ hits: "desc" }, { pattern: "asc" }] }),
    db.accountingCategory.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return rules.map((rule) => ({
    id: rule.id,
    field: rule.field,
    pattern: rule.pattern,
    direction: rule.direction,
    categoryName: names.get(rule.categoryId) ?? "—",
    taxRate: rule.taxRate,
    hits: rule.hits,
  }));
}

/** Formdaki açık fatura seçimi. */
export async function listOpenInvoiceOptions(): Promise<
  Array<{ value: string; label: string; openCents: number }>
> {
  const invoices = await getDb().accountingInvoice.findMany({
    where: { kind: "INVOICE", status: "ISSUED" },
    orderBy: { issueDate: "asc" },
  });
  return invoices
    .map((invoice) => ({
      value: invoice.id,
      label: `${invoice.number ?? "—"} · ${invoice.recipientName}`,
      openCents: openCents(invoice),
    }))
    .filter((invoice) => invoice.openCents > 0);
}
