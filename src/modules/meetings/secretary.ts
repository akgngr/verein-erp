import "server-only";

import { parseDate } from "@internationalized/date";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";
import { meetingsPermissions } from "./permissions";

function berlinDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function buildMeetingBriefing(counts: { upcoming: number; noAgenda: number }, context: Pick<SecretaryContext, "t">, day: string): BriefingItem[] {
  const items: BriefingItem[] = [];
  if (counts.upcoming > 0) items.push({
    id: "meetings:upcoming",
    module: "meetings", kind: "upcoming", severity: "info",
    title: context.t("secretary.upcoming", { count: counts.upcoming }),
    count: counts.upcoming, dueAt: day, href: "/toplantilar",
  });
  if (counts.noAgenda > 0) items.push({
    id: "meetings:missing-agenda",
    module: "meetings", kind: "missing-agenda", severity: "warning",
    title: context.t("secretary.missingAgenda", { count: counts.noAgenda }),
    count: counts.noAgenda, dueAt: day, href: "/toplantilar",
  });
  return items;
}

async function countMeetings(now: Date): Promise<{ upcoming: number; noAgenda: number }> {
  const day = parseDate(berlinDay(now));
  const start = new Date(`${day.toString()}T00:00:00.000Z`);
  const end = new Date(`${day.add({ days: 3 }).toString()}T00:00:00.000Z`);
  const meetings = await getDb().meeting.findMany({
    where: { deletedAt: null, status: "PLANNED", meetingDate: { gte: start, lt: end } },
    select: { id: true, _count: { select: { agendaItems: true } } },
    take: 500,
  });
  return {
    upcoming: meetings.length,
    noAgenda: meetings.filter((meeting) => meeting._count.agendaItems === 0).length,
  };
}

export const secretary = defineModuleSecretary({
  module: "meetings",
  providers: [{
    key: "upcoming",
    permission: { definition: meetingsPermissions, action: "view" },
    collect: async (context) => buildMeetingBriefing(await countMeetings(context.now), context, berlinDay(context.now)),
  }],
});
