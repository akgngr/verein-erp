import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo, demoPerson } from "@/shared/demo/define";

import { nextContactNumber } from "./services/invoice-payments";
import { formatBookingNumber } from "./services/booking-number";
import { formatInvoiceNumber } from "./services/invoice-number";

const SERVICES: [string, number, number][] = [
  ["Raummiete Vereinsheim", 1, 25000],
  ["Nachhilfe Mathematik (Stunden)", 8, 2500],
  ["Catering Sommerfest", 1, 48000],
  ["Workshop-Teilnahme", 5, 3500],
  ["Druck Flyer", 500, 12],
];
type InvoicePlan = { kind: "INVOICE" | "QUOTE" | "PROFORMA"; status: "DRAFT" | "ISSUED" | "PAID" };
const INVOICE_PLAN: InvoicePlan[] = [
  ...Array.from({ length: 3 }, () => ({ kind: "INVOICE", status: "DRAFT" }) as InvoicePlan),
  ...Array.from({ length: 4 }, () => ({ kind: "INVOICE", status: "ISSUED" }) as InvoicePlan),
  ...Array.from({ length: 3 }, () => ({ kind: "INVOICE", status: "PAID" }) as InvoicePlan),
  ...Array.from({ length: 3 }, () => ({ kind: "QUOTE", status: "ISSUED" }) as InvoicePlan),
  ...Array.from({ length: 2 }, () => ({ kind: "PROFORMA", status: "ISSUED" }) as InvoicePlan),
];

const PROJECTS = ["Sommerfest", "Jugendarbeit", "Renovierung", "Sprachkurse", "Kulturprogramm", "Sportgruppe", "Bibliothek", "Nachhilfe", "Ausflüge", "Öffentlichkeitsarbeit"];

/**
 * 30 kurgusal cari (20 müşteri, 10 tedarikçi), 15 belge (fatura/teklif/proforma) ve 10 proje.
 * Ayrıca 30 muhasebe kaydı (Buchung). Kayıtlar GoBD gereği veritabanında silinemez: demo kapatıldığında
 * test veritabanında kalır (üretim veritabanı yalnızca migration'larla kurulur, bu veri oraya taşınmaz).
 */
export const demo = defineDemo({
  moduleKey: "accounting",
  order: 90,
  async seed(ctx) {
    const db = getDb();
    const refs = ctx.refs;
    for (const [type, count, offset] of [["CUSTOMER", 20, 500], ["SUPPLIER", 10, 600]] as const) {
      let last = (await db.accountingContact.findFirst({ where: { type }, orderBy: { number: "desc" }, select: { number: true } }))?.number ?? null;
      for (let i = 0; i < count; i++) {
        const p = demoPerson(i + offset);
        const number = nextContactNumber(type, last);
        last = number;
        const contact = await db.accountingContact.create({
          data: {
            type,
            number,
            name: type === "SUPPLIER" ? `Lieferant Beispiel ${i + 1} GmbH` : `${p.firstName} ${p.lastName}`,
            contactPerson: type === "SUPPLIER" ? `${p.firstName} ${p.lastName}` : null,
            address: `${p.street} ${p.houseNumber}, ${p.postalCode} ${p.city}`,
            email: p.email,
            phone: p.phone,
            paymentTermDays: 14,
            notes: DEMO_NOTE,
          },
          select: { id: true },
        });
        refs.push({ model: "accountingContact", id: contact.id });
      }
    }
    // 15 belge (10 fatura: taslak/kesilmiş/ödenmiş, 3 teklif, 2 proforma). Muhasebe kaydı (Buchung)
    // oluşturulmaz; numaralar 9001'den başlar, gerçek sayaç değişmez.
    const customers = refs.filter((r) => r.model === "accountingContact").slice(0, 20);
    const year = new Date().getUTCFullYear();
    const seqByKind: Record<string, number> = { INVOICE: 9000, QUOTE: 9000, PROFORMA: 9000 };
    for (let i = 0; i < INVOICE_PLAN.length; i++) {
      const plan = INVOICE_PLAN[i];
      const customer = customers.length ? await db.accountingContact.findUnique({ where: { id: customers[i % customers.length].id }, select: { id: true, name: true, address: true, email: true } }) : null;
      const [desc, qty, unitPriceCents] = SERVICES[i % SERVICES.length];
      const netCents = qty * unitPriceCents;
      const taxCents = Math.round(netCents * 0.19);
      const issueDate = daysFromNow(-60 + i * 4);
      const numbered = plan.status !== "DRAFT";
      const sequence = numbered ? ++seqByKind[plan.kind] : null;
      const invoice = await db.accountingInvoice.create({
        data: {
          kind: plan.kind,
          status: plan.status,
          number: sequence ? formatInvoiceNumber(plan.kind, year, sequence) : null,
          year: sequence ? year : null,
          sequence,
          issueDate,
          dueDate: daysFromNow(-46 + i * 4),
          serviceDate: issueDate.toISOString().slice(0, 7),
          recipientName: customer?.name ?? `Kunde Beispiel ${i + 1}`,
          recipientAddress: customer?.address ?? null,
          recipientEmail: customer?.email ?? null,
          contactId: customer?.id ?? null,
          subject: `${desc} (Demo)`,
          netCents,
          taxCents,
          grossCents: netCents + taxCents,
          paidCents: plan.status === "PAID" ? netCents + taxCents : 0,
          issuedAt: numbered ? issueDate : null,
          paidAt: plan.status === "PAID" ? daysFromNow(-30 + i) : null,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
          lines: { create: [{ position: 1, description: desc, quantity: qty, unit: qty > 1 ? "Stk." : null, unitPriceCents, taxRate: 19, totalCents: netCents }] },
        },
        select: { id: true },
      });
      refs.push({ model: "accountingInvoice", id: invoice.id });
    }
    await seedBookings(db, ctx, refs);
    for (const name of PROJECTS) {
      const exists = await db.accountingProject.findUnique({ where: { name: `${name} (Demo)` }, select: { id: true } });
      if (exists) continue;
      const project = await db.accountingProject.create({ data: { name: `${name} (Demo)` }, select: { id: true } });
      refs.push({ model: "accountingProject", id: project.id });
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      // GoBD: veritabanı silmeyi reddeder; kayıtlar test veritabanında kalır (clearRefs "silinemedi" döndürür).
      accountingBooking: (ids) => getDb().accountingBooking.deleteMany({ where: { id: { in: ids } } }),
      accountingInvoice: (ids) => getDb().accountingInvoice.deleteMany({ where: { id: { in: ids } } }),
      accountingContact: (ids) => getDb().accountingContact.deleteMany({ where: { id: { in: ids } } }),
      accountingProject: (ids) => getDb().accountingProject.deleteMany({ where: { id: { in: ids } } }),
    }),
});

const BOOKINGS: [string, "INCOME" | "EXPENSE", number, number][] = [
  ["Mitgliedsbeitrag", "INCOME", 60, 0],
  ["Spende bar", "INCOME", 50, 0],
  ["Kursgebühr", "INCOME", 120, 19],
  ["Raummiete", "EXPENSE", 450, 0],
  ["Büromaterial", "EXPENSE", 38.5, 19],
  ["Getränke Sommerfest", "EXPENSE", 210, 7],
];

/** 30 kurgusal muhasebe kaydı (gelir/gider), son 6 aya yayılmış. Mevcut hesap/kategoriler kullanılır. */
async function seedBookings(db: ReturnType<typeof getDb>, ctx: { userId: string; userLabel: string }, refs: { model: string; id: string }[]) {
  const account = await db.accountingAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const income = await db.accountingCategory.findFirst({ where: { isActive: true, direction: "INCOME", isAsset: false }, select: { id: true } });
  const expense = await db.accountingCategory.findFirst({ where: { isActive: true, direction: "EXPENSE", isAsset: false }, select: { id: true } });
  if (!account || !income || !expense) return; // muhasebe kurulmamış (kurulum sihirbazı): kayıt üretilmez
  for (let i = 0; i < 30; i++) {
    const [text, type, gross, taxRate] = BOOKINGS[i % BOOKINGS.length];
    const bookingDate = daysFromNow(-180 + i * 6);
    const year = bookingDate.getUTCFullYear();
    const last = await db.accountingBooking.findFirst({ where: { year, sequence: { gte: 9001 } }, orderBy: { sequence: "desc" }, select: { sequence: true } });
    const sequence = (last?.sequence ?? 9000) + 1;
    const amount = gross + (i % 5) * 10;
    const net = Math.round((amount / (1 + taxRate / 100)) * 100) / 100;
    const booking = await db.accountingBooking.create({
      data: {
        year,
        sequence,
        bookingNumber: formatBookingNumber(year, sequence),
        type,
        bookingDate,
        accountId: account.id,
        categoryId: type === "INCOME" ? income.id : expense.id,
        amount,
        taxRate,
        netAmount: net,
        taxAmount: Math.round((amount - net) * 100) / 100,
        description: `${text} (Demo)`,
        counterparty: demoPerson(i + 700).lastName,
        createdById: ctx.userId,
        createdByLabel: ctx.userLabel,
      },
      select: { id: true },
    });
    refs.push({ model: "accountingBooking", id: booking.id });
  }
}
