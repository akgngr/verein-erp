import "server-only";

import { getDb } from "@/shared/db";
import { DEMO_NOTE, clearRefs, daysFromNow, defineDemo } from "@/shared/demo/define";

const TITLES = ["Mitgliederliste prüfen", "Raum für Sommerfest buchen", "Flyer drucken", "Kassenprüfung vorbereiten", "Webseite aktualisieren", "Spendenquittungen versenden", "Getränke bestellen", "Protokoll verteilen", "Versicherung verlängern", "Schlüssel übergeben"];
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "OPEN", "OPEN", "IN_PROGRESS", "DONE", "OPEN", "CANCELLED", "OPEN"] as const;
const PRIORITIES = ["NORMAL", "HIGH", "LOW"] as const;

/** 10 kurgusal görev. */
export const demo = defineDemo({
  moduleKey: "tasks",
  order: 60,
  async seed(ctx) {
    const db = getDb();
    const refs = ctx.refs;
    for (let i = 0; i < TITLES.length; i++) {
      const task = await db.task.create({
        data: {
          title: `${TITLES[i]} (Demo)`,
          description: DEMO_NOTE,
          status: STATUSES[i],
          priority: PRIORITIES[i % PRIORITIES.length],
          dueDate: daysFromNow(-5 + i * 4),
          completedAt: STATUSES[i] === "DONE" ? daysFromNow(-1) : null,
          createdById: ctx.userId,
          createdByLabel: ctx.userLabel,
        },
        select: { id: true },
      });
      refs.push({ model: "task", id: task.id });
    }
    return refs;
  },
  clear: (refs) => clearRefs(refs, { task: (ids) => getDb().task.deleteMany({ where: { id: { in: ids } } }) }),
});
