import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo } from "@/shared/demo/define";

import { formatMeetingNumber } from "./services/meeting-number";

const TITLES = ["Vorstandssitzung Januar", "Vorstandssitzung Februar", "Mitgliederversammlung", "Festausschuss", "Vorstandssitzung März", "Jugendausschuss", "Vorstandssitzung April", "Finanzausschuss", "Vorstandssitzung Mai", "Klausurtagung"];
const TYPES = ["BOARD", "BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "BOARD", "COMMITTEE", "BOARD", "COMMITTEE", "BOARD", "OTHER"] as const;

/** 10 kurgusal toplantı (gündem maddeleriyle). Numara sırası 9001'den başlar; sayaç değişmez. */
export const demo = defineDemo({
  moduleKey: "meetings",
  order: 70,
  async seed(ctx) {
    const db = getDb();
    const year = new Date().getUTCFullYear();
    const refs = ctx.refs;
    for (let i = 0; i < TITLES.length; i++) {
      const sequence = 9001 + i;
      const meeting = await db.meeting.create({
        data: {
          year,
          sequence,
          meetingNumber: formatMeetingNumber(year, sequence),
          type: TYPES[i],
          title: `${TITLES[i]} (Demo)`,
          meetingDate: daysFromNow(-60 + i * 14),
          startTime: "19:00",
          endTime: "21:00",
          location: "Vereinsheim",
          description: DEMO_NOTE,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
          agendaItems: {
            create: [
              { position: 1, title: "Begrüßung" },
              { position: 2, title: "Bericht des Vorstands" },
              { position: 3, title: "Verschiedenes" },
            ],
          },
        },
        select: { id: true },
      });
      refs.push({ model: "meeting", id: meeting.id });
    }
    return refs;
  },
  clear: (refs) =>
    clearRefs(refs, {
      meeting: async (ids) => {
        const db = getDb();
        const where = { meetingId: { in: ids } };
        await db.actionItem.deleteMany({ where });
        await db.meetingDecision.deleteMany({ where });
        await db.meetingAttendee.deleteMany({ where });
        await db.agendaItem.deleteMany({ where });
        await db.meeting.deleteMany({ where: { id: { in: ids } } });
      },
    }),
});
