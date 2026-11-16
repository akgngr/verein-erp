import { openCents } from "./invoice-payments";

export type InvoiceOpenAmount = {
  grossCents: number;
  paidCents: number;
  skontoCents: number;
};

/** The caller has already filtered by status and due date. */
export function summarizeOverdueInvoices(invoices: readonly InvoiceOpenAmount[]): {
  count: number;
  cents: number;
} {
  return invoices.reduce(
    (acc, invoice) => {
      const amount = openCents(invoice);
      return amount > 0
        ? { count: acc.count + 1, cents: acc.cents + amount }
        : acc;
    },
    { count: 0, cents: 0 },
  );
}
