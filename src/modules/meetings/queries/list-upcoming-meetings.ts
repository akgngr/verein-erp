import "server-only";

import { getDb } from "@/shared/db";

import { berlinToday } from "../utils";

/** Panel kartı: bugünden itibaren planlanan ilk toplantılar. */
export async function listUpcomingMeetings(take = 5) {
  return getDb().meeting.findMany({
    where: { deletedAt: null, status: "PLANNED", meetingDate: { gte: berlinToday() } },
    orderBy: [{ meetingDate: "asc" }, { startTime: "asc" }],
    take,
    select: { id: true, meetingNumber: true, title: true, meetingDate: true, startTime: true, location: true },
  });
}
