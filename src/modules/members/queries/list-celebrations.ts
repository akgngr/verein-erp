import "server-only";

import { getDb } from "@/shared/db";

import { upcomingCelebrations, type Celebration } from "../lib/celebrations";
import { berlinToday } from "../utils";

/**
 * #605: Upcoming birthdays and anniversaries of current members (ACTIVE/PASSIVE, not deleted). One query that
 * selects only the fields needed; the date arithmetic runs in `upcomingCelebrations`.
 */
export async function listUpcomingCelebrations(limit = 8): Promise<Celebration[]> {
  const members = await getDb().member.findMany({
    where: { deletedAt: null, status: { in: ["ACTIVE", "PASSIVE"] } },
    select: { id: true, firstName: true, lastName: true, membershipNumber: true, birthDate: true, joinDate: true },
  });
  return upcomingCelebrations(members, berlinToday()).slice(0, limit);
}
