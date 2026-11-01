import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, defineDemo, demoPerson } from "@/shared/demo/define";

import { nextContactNumber } from "./services/invoice-payments";

const PROJECTS = ["Sommerfest", "Jugendarbeit", "Renovierung", "Sprachkurse", "Kulturprogramm", "Sportgruppe", "Bibliothek", "Nachhilfe", "Ausflüge", "Öffentlichkeitsarbeit"];

/**
 * 30 kurgusal cari (20 müşteri, 10 tedarikçi) ve 10 proje. Kayıt (Buchung) ve fatura ÜRETİLMEZ:
 * GoBD gereği değiştirilemez/silinemez; demo kapatıldığında sistem temiz kalmalıdır.
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
      accountingContact: (ids) => getDb().accountingContact.deleteMany({ where: { id: { in: ids } } }),
      accountingProject: (ids) => getDb().accountingProject.deleteMany({ where: { id: { in: ids } } }),
    }),
});
