import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo } from "@/shared/demo/define";

const TITLES = ["Sommerfest", "Vereinsausflug", "Workshop Buchhaltung", "Kulturabend", "Fußballturnier", "Seminar Datenschutz", "Elternabend", "Iftar-Abend", "Flohmarkt", "Jahresabschlussfeier"];
const TYPES = ["SOCIAL", "SOCIAL", "WORKSHOP", "CULTURAL", "SPORTS", "SEMINAR", "OTHER", "CULTURAL", "SOCIAL", "SOCIAL"];

/** 10 kurgusal etkinlik (geçmiş ve gelecek karışık). */
export const demo = defineDemo({
  moduleKey: "events",
  order: 40,
  async seed(ctx) {
    const db = getDb();
    const refs = ctx.refs;
    for (let i = 0; i < 10; i++) {
      const start = daysFromNow(-40 + i * 12);
      start.setUTCHours(16);
      const event = await db.event.create({
        data: {
          title: `${TITLES[i]} (Demo)`,
          description: DEMO_NOTE,
          type: TYPES[i],
          status: i < 3 ? "COMPLETED" : i === 9 ? "DRAFT" : "PUBLISHED",
          startDate: start,
          location: i % 4 === 0 ? null : "Vereinsheim, Musterstraße 1",
          isOnline: i % 4 === 0,
          onlineUrl: i % 4 === 0 ? "https://example.com/meet" : null,
          capacity: 20 + i * 5,
          createdById: ctx.userId,
        },
        select: { id: true },
      });
      refs.push({ model: "event", id: event.id });
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      event: async (ids) => {
        const db = getDb();
        await db.eventAttendee.deleteMany({ where: { eventId: { in: ids } } });
        await db.event.deleteMany({ where: { id: { in: ids } } });
      },
    }),
});
