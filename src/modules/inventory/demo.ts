import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo } from "@/shared/demo/define";

const ITEMS: [string, string, string][] = [
  ["Beamer", "ELECTRONICS", "IN_USE"],
  ["Laptop", "ELECTRONICS", "IN_USE"],
  ["Klapptisch", "FURNITURE", "IDLE"],
  ["Stuhl (10er-Set)", "FURNITURE", "IN_USE"],
  ["Lautsprecher", "ELECTRONICS", "BROKEN"],
  ["Whiteboard", "FURNITURE", "IN_USE"],
  ["Kaffeemaschine", "OTHER", "IN_USE"],
  ["Drucker", "ELECTRONICS", "IDLE"],
  ["Pavillon", "OTHER", "IDLE"],
  ["Mikrofon", "ELECTRONICS", "SCRAPPED"],
];

/** 10 kurgusal demirbaş. */
export const demo = defineDemo({
  moduleKey: "inventory",
  order: 50,
  async seed(ctx) {
    const db = getDb();
    const refs = ctx.refs;
    for (let i = 0; i < ITEMS.length; i++) {
      const [name, category, status] = ITEMS[i];
      const item = await db.inventoryItem.create({
        data: {
          name: `${name} (Demo)`,
          category,
          status,
          serialNumber: `DEMO-${1000 + i}`,
          location: i % 2 === 0 ? "Lager" : "Büro",
          quantity: i === 3 ? 10 : 1,
          purchaseDate: daysFromNow(-200 - i * 30),
          purchasePrice: 50 + i * 75,
          description: DEMO_NOTE,
        },
        select: { id: true },
      });
      refs.push({ model: "inventoryItem", id: item.id });
    }
    return refs;
  },
  clear: (refs) => clearRefs(refs, { inventoryItem: (ids) => getDb().inventoryItem.deleteMany({ where: { id: { in: ids } } }) }),
});
