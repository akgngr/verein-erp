import "server-only";

import type { ContactType } from "@prisma/client";

import { getDb } from "@/shared/db";

import { openCents } from "../services/invoice-payments";
import type { ContactOption } from "../types";

export type ContactRow = {
  id: string;
  type: ContactType;
  number: number;
  name: string;
  contactPerson: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  vatId: string | null;
  paymentTermDays: number | null;
  notes: string | null;
  isActive: boolean;
  invoiceCount: number;
  openCents: number;
};

export async function listContacts(filters: { type?: string; q?: string }): Promise<ContactRow[]> {
  const q = filters.q?.trim();
  const rows = await getDb().accountingContact.findMany({
    where: {
      ...(filters.type === "CUSTOMER" || filters.type === "SUPPLIER" ? { type: filters.type } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : [])] } : {}),
    },
    orderBy: [{ type: "asc" }, { number: "asc" }],
    take: 500,
    include: { invoices: { where: { kind: "INVOICE", status: { not: "DRAFT" } }, select: { status: true, grossCents: true, paidCents: true, skontoCents: true } } },
  });
  return rows.map(({ invoices, ...row }) => ({
    ...row,
    invoiceCount: invoices.length,
    openCents: invoices.filter((invoice) => invoice.status === "ISSUED").reduce((sum, invoice) => sum + openCents(invoice), 0),
  }));
}

export async function getContact(id: string): Promise<ContactRow | null> {
  const rows = await listContacts({});
  return rows.find((row) => row.id === id) ?? null;
}

/** Fatura formu: aktif müşteriler. */
export async function listCustomerOptions(): Promise<ContactOption[]> {
  return getDb().accountingContact.findMany({
    where: { type: "CUSTOMER", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, number: true, name: true, address: true, email: true, paymentTermDays: true },
  });
}
